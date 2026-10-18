import mongoose from 'mongoose'
import { AuthSession } from '../models/AuthSession.js'
import { AbuseReport } from '../models/AbuseReport.js'
import { BlockedDomain } from '../models/BlockedDomain.js'
import { ClickEvent } from '../models/ClickEvent.js'
import { Link } from '../models/Link.js'
import { User } from '../models/User.js'
import { PlatformSetting } from '../models/PlatformSetting.js'
import { env } from '../config/env.js'
import { classifyUserAgent } from '../utils/ua.js'
import { makeVisitorKey, randomToken, signValue, verifyPassword, verifyValue, hashPassword } from '../utils/crypto.js'
import { AppError } from '../utils/errors.js'
import { parseDestination } from '../utils/url.js'
import { writeAuditLog } from './audit.service.js'
import { assertOwnedReferences } from './resource.service.js'

const alphabet = '23456789abcdefghjkmnpqrstuvwxyz'

function randomCode(size = 8) {
  const bytes = Buffer.from(randomToken(size).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  return Array.from(bytes.slice(0, size), (byte) => alphabet[byte % alphabet.length]).join('')
}

async function assertNotBlocked(destination) {
  const hostname = new URL(destination).hostname.toLowerCase()
  const domains = await BlockedDomain.find({ active: true }).select('domain').lean()
  if (domains.some(({ domain }) => hostname === domain || hostname.endsWith(`.${domain}`))) {
    throw new AppError(422, 'DESTINATION_BLOCKED', 'This destination domain is blocked by LinkPulse.')
  }
}

function normalizeExpiry(value) {
  if (value === '' || value === null || value === undefined) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || date <= new Date()) throw new AppError(400, 'INVALID_EXPIRY', 'Expiry must be a valid future date.')
  return date
}

export function serializeLink(link) {
  const item = link.toObject ? link.toObject() : link
  delete item.passwordHash
  item.shortUrl = new URL(`/${item.code}`, env.PUBLIC_SHORT_DOMAIN).toString()
  item.clicks = item.clickCount
  return item
}

export async function createLink(userId, input) {
  const destination = parseDestination(input.destination)
  await assertNotBlocked(destination)
  await assertOwnedReferences(userId, input)
  const [settings, existingLinkCount] = await Promise.all([
    PlatformSetting.findOne({ key: 'platform' }).select('defaultLinkLimit').lean(),
    Link.countDocuments({ userId }),
  ])
  if (existingLinkCount >= (settings?.defaultLinkLimit ?? 1000)) {
    throw new AppError(403, 'LINK_LIMIT_REACHED', 'Your workspace has reached the platform link limit.')
  }
  const expiry = normalizeExpiry(input.expiresAt)
  const passwordHash = input.password ? await hashPassword(input.password) : null
  const customAlias = Boolean(input.alias)
  let link
  for (let attempt = 0; attempt < (customAlias ? 1 : 8); attempt += 1) {
    const code = customAlias ? input.alias.toLowerCase() : randomCode()
    if (!customAlias && await Link.exists({ code })) continue
    try {
      link = await Link.create({
        userId, destination, code, customAlias,
        title: input.title || '', campaignId: input.campaignId || null,
        folderId: input.folderId || null, tagIds: input.tagIds || [],
        expiresAt: expiry, maxClicks: input.maxClicks ?? null,
        passwordHash, qrEnabled: input.qrEnabled ?? true,
      })
      break
    } catch (error) {
      if (error?.code !== 11000 || customAlias) throw error
    }
  }
  if (!link) throw new AppError(503, 'CODE_GENERATION_FAILED', 'Could not allocate a short code. Retry the request.')
  await writeAuditLog({ actorId: userId, action: 'link.create', resourceType: 'link', resourceId: link._id })
  return serializeLink(link)
}

function buildLinkFilter(userId, query) {
  const filter = { userId }
  if (query.campaignId) filter.campaignId = query.campaignId
  if (query.folderId) filter.folderId = query.folderId
  if (query.tagId) filter.tagIds = query.tagId
  if (query.q) {
    const safe = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [
      { code: { $regex: safe, $options: 'i' } },
      { title: { $regex: safe, $options: 'i' } },
      { destination: { $regex: safe, $options: 'i' } },
    ]
  }
  if (query.status === 'expired') {
    filter.status = 'active'
    filter.expiresAt = { $lte: new Date() }
  } else if (query.status && query.status !== 'all') {
    filter.status = query.status
    if (query.status === 'active') {
      filter.$and = [...(filter.$and || []), { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }]
    }
  }
  return filter
}

export async function listLinks(userId, query, pagination) {
  const filter = buildLinkFilter(userId, query)
  const sort = { [query.sort || 'createdAt']: query.order === 'asc' ? 1 : -1, _id: -1 }
  const [links, total] = await Promise.all([
    Link.find(filter).select('+passwordHash').sort(sort).skip(pagination.skip).limit(pagination.limit).lean(),
    Link.countDocuments(filter),
  ])
  return {
    items: links.map((link) => serializeLink(link)),
    pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) },
  }
}

export async function getOwnedLink(userId, id) {
  const link = await Link.findOne({ _id: id, userId }).select('+passwordHash')
  if (!link) throw new AppError(404, 'LINK_NOT_FOUND', 'Link not found.')
  return link
}

export async function updateLink(userId, id, input) {
  const link = await getOwnedLink(userId, id)
  const changes = { ...input }
  if (link.status === 'taken_down' && changes.status === 'active') {
    throw new AppError(403, 'LINK_TAKEN_DOWN', 'A link taken down by an administrator cannot be reactivated.')
  }
  if (Object.hasOwn(changes, 'destination')) {
    changes.destination = parseDestination(changes.destination)
    await assertNotBlocked(changes.destination)
  }
  await assertOwnedReferences(userId, changes)
  if (Object.hasOwn(changes, 'expiresAt')) changes.expiresAt = normalizeExpiry(changes.expiresAt)
  if (Object.hasOwn(changes, 'password')) {
    link.passwordHash = changes.password ? await hashPassword(changes.password) : null
    delete changes.password
  }
  if (Object.hasOwn(changes, 'alias')) {
    if (!changes.alias) throw new AppError(400, 'INVALID_ALIAS', 'Alias cannot be empty.')
    link.code = changes.alias.toLowerCase()
    link.customAlias = true
    delete changes.alias
  }
  for (const [key, value] of Object.entries(changes)) {
    if (key !== 'expiresAt' && key !== 'campaignId' && key !== 'folderId') link.set(key, value)
    else link.set(key, value === '' ? null : value)
  }
  await link.save()
  await writeAuditLog({ actorId: userId, action: 'link.update', resourceType: 'link', resourceId: link._id })
  return serializeLink(link)
}

export async function deleteLink(userId, id) {
  const link = await getOwnedLink(userId, id)
  link.status = 'disabled'
  await link.save()
  await writeAuditLog({ actorId: userId, action: 'link.disable', resourceType: 'link', resourceId: link._id })
  return serializeLink(link)
}

export async function getRedirectState(code, unlockCookie) {
  const link = await Link.findOne({ code: code.toLowerCase() }).select('+passwordHash')
  if (!link) return { state: 'not_found' }
  if (link.status === 'taken_down') return { state: 'disabled' }
  if (link.status === 'disabled') return { state: 'disabled' }
  if (link.expiresAt && link.expiresAt <= new Date()) return { state: 'expired' }
  if (link.maxClicks !== null && link.clickCount >= link.maxClicks) return { state: 'disabled' }
  if (link.passwordHash) {
    const unlock = verifyValue(unlockCookie, 'link-unlock')
    const [unlockedLinkId, rawExpiry] = unlock?.split(':') || []
    if (unlockedLinkId !== link._id.toString()) return { state: 'password_required', id: link._id }
    const expiresAt = Number(rawExpiry)
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return { state: 'password_required', id: link._id }
  }
  return { state: 'ready', link }
}

export async function unlockLink(code, password) {
  const link = await Link.findOne({ code: code.toLowerCase() }).select('+passwordHash')
  if (!link || link.status !== 'active' || !link.passwordHash) throw new AppError(404, 'PROTECTED_LINK_NOT_FOUND', 'Protected link was not found.')
  if (link.expiresAt && link.expiresAt <= new Date()) throw new AppError(410, 'LINK_EXPIRED', 'This link has expired.')
  if (link.maxClicks !== null && link.clickCount >= link.maxClicks) throw new AppError(410, 'CLICK_LIMIT_REACHED', 'This link has reached its click limit.')
  if (!(await verifyPassword(password, link.passwordHash))) throw new AppError(401, 'INVALID_LINK_PASSWORD', 'The link password is incorrect.')
  const expiresAt = Date.now() + 15 * 60 * 1000
  return { token: signValue(`${link._id}:${expiresAt}`, 'link-unlock'), maxAge: 15 * 60 * 1000 }
}

export async function recordClickAndGetDestination(linkId, req) {
  const { bot, device, browser } = classifyUserAgent(req.get('user-agent'))
  const referer = req.get('referer')
  let referrerHost = 'direct'
  if (referer) {
    try { referrerHost = new URL(referer).hostname.toLowerCase().slice(0, 253) || 'direct' } catch { referrerHost = 'other' }
  }
  if (bot) {
    const link = await Link.findOne({
      _id: linkId, status: 'active',
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
        { $or: [{ maxClicks: null }, { $expr: { $lt: ['$clickCount', '$maxClicks'] } }] },
      ],
    }).select('destination').lean()
    if (!link) return { unavailable: true, bot: true }
    return { destination: link.destination, bot: true }
  }
  const session = await mongoose.startSession()
  let destination
  try {
    await session.withTransaction(async () => {
      const link = await Link.findOneAndUpdate({
        _id: linkId,
        status: 'active',
        $and: [
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
          { $or: [{ maxClicks: null }, { $expr: { $lt: ['$clickCount', '$maxClicks'] } }] },
        ],
      }, { $inc: { clickCount: 1 } }, { returnDocument: 'after', session })
      if (!link) return
      destination = link.destination
      await ClickEvent.create([{
        linkId: link._id, ownerId: link.userId, campaignId: link.campaignId,
        visitorKey: makeVisitorKey(req.ip, req.get('user-agent')),
        referrerHost, device, browser, isBot: false, occurredAt: new Date(),
      }], { session })
    })
  } finally { await session.endSession() }
  if (!destination) return { unavailable: true, bot: false }
  return { destination, bot }
}

export async function listGlobalLinks(query, pagination) {
  const filter = query.q ? {
    $or: [
      { code: { $regex: query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      { destination: { $regex: query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    ],
  } : {}
  if (query.status === 'expired') {
    filter.status = 'active'
    filter.expiresAt = { $lte: new Date() }
  } else if (query.status && query.status !== 'all') {
    filter.status = query.status
    if (query.status === 'active') filter.$and = [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }]
  }
  const [links, total] = await Promise.all([
    Link.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).populate('userId', 'name email').lean(),
    Link.countDocuments(filter),
  ])
  return { items: links.map((item) => ({ ...serializeLink(item), user: item.userId, userId: item.userId?._id })), pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) } }
}

export async function moderateLink(admin, id, reason, status) {
  const session = await mongoose.startSession()
  let link
  try {
    await session.withTransaction(async () => {
      link = await Link.findByIdAndUpdate(id, {
        $set: status === 'taken_down'
          ? { status, takenDownAt: new Date(), takenDownBy: admin._id, takedownReason: reason }
          : { status: 'active', takenDownAt: null, takenDownBy: null, takedownReason: null },
      }, { returnDocument: 'after', runValidators: true, session })
      if (!link) throw new AppError(404, 'LINK_NOT_FOUND', 'Link not found.')
      await writeAuditLog({
        actorId: admin._id, targetUserId: link.userId,
        action: status === 'taken_down' ? 'admin.link.takedown' : 'admin.link.restore',
        resourceType: 'link', resourceId: link._id, metadata: { reason },
      }, { session })
    })
  } finally { await session.endSession() }
  return serializeLink(link)
}

export async function revokeSessions(userId) {
  return AuthSession.deleteMany({ userId })
}

export async function lookupUser(id) {
  const user = await User.findById(id).select('name email role status plan createdAt')
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.')
  return user
}

export async function submitAbuseReport(input) {
  const link = await Link.findOne({ code: input.code.toLowerCase() }).select('_id').lean()
  return AbuseReport.create({
    code: input.code.toLowerCase(),
    linkId: link?._id || null,
    reporterEmail: input.email || '',
    reason: input.reason,
    details: input.details || '',
  })
}
