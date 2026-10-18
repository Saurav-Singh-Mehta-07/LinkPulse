import mongoose from 'mongoose'
import { AbuseReport } from '../models/AbuseReport.js'
import { AuditLog } from '../models/AuditLog.js'
import { BlockedDomain } from '../models/BlockedDomain.js'
import { AuthSession } from '../models/AuthSession.js'
import { PlatformSetting } from '../models/PlatformSetting.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/errors.js'
import { normalizeDomain as normalizeDomainName } from '../utils/url.js'
import { writeAuditLog } from './audit.service.js'

export async function listUsers(query, pagination) {
  const filter = {}
  if (query.status && query.status !== 'all') filter.status = query.status
  if (query.q) {
    const safe = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.$or = [{ name: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }]
  }
  const [items, total] = await Promise.all([
    User.find(filter).select('name email role status plan createdAt lastLoginAt').sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    User.countDocuments(filter),
  ])
  return { items, pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) } }
}

export async function setUserStatus(admin, id, status) {
  if (admin._id.toString() === id) throw new AppError(400, 'CANNOT_MODIFY_SELF', 'You cannot suspend your own admin account.')
  const session = await mongoose.startSession()
  let user
  try {
    await session.withTransaction(async () => {
      user = await User.findByIdAndUpdate(id, { $set: { status } }, { returnDocument: 'after', runValidators: true, session }).select('name email role status plan')
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.')
      if (user.role === 'admin' && status === 'suspended') {
        throw new AppError(403, 'ADMIN_SUSPENSION_RESTRICTED', 'Admin accounts cannot be suspended through user management.')
      }
      if (status === 'suspended') await AuthSession.deleteMany({ userId: user._id }, { session })
      await writeAuditLog({
        actorId: admin._id, targetUserId: user._id, action: `admin.user.${status}`,
        resourceType: 'user', resourceId: user._id,
      }, { session })
    })
  } finally { await session.endSession() }
  return user
}

export async function listAbuseReports(query, pagination) {
  const filter = query.status && query.status !== 'all' ? { status: query.status } : {}
  const [items, total] = await Promise.all([
    AbuseReport.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).populate('linkId', 'code destination status').populate('reviewedBy', 'name email').lean(),
    AbuseReport.countDocuments(filter),
  ])
  return { items, pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) } }
}

export async function reviewAbuseReport(admin, id, status, resolution) {
  const report = await AbuseReport.findByIdAndUpdate(id, {
    $set: { status, resolution, reviewedBy: admin._id, reviewedAt: new Date() },
  }, { returnDocument: 'after', runValidators: true })
  if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Abuse report not found.')
  await writeAuditLog({
    actorId: admin._id, action: `admin.abuse_report.${status}`,
    resourceType: 'abuse_report', resourceId: report._id, metadata: { resolution },
  })
  return report
}

function normalizeDomain(input) {
  const raw = input.trim().toLowerCase()
  if (raw.includes('/') || raw.includes('@') || raw.includes(':') || /\s/.test(raw)) {
    throw new AppError(400, 'INVALID_DOMAIN', 'Enter a hostname only, without scheme, path, or port.')
  }
  return normalizeDomainName(raw)
}

export async function listBlockedDomains(pagination) {
  const [items, total] = await Promise.all([
    BlockedDomain.find().sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).populate('addedBy', 'name email').lean(),
    BlockedDomain.countDocuments(),
  ])
  return { items, pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) } }
}

export async function addBlockedDomain(admin, input) {
  const domain = normalizeDomain(input.domain)
  const item = await BlockedDomain.create({ domain, reason: input.reason, addedBy: admin._id, active: true })
  await writeAuditLog({ actorId: admin._id, action: 'admin.domain_block.create', resourceType: 'blocked_domain', resourceId: item._id, metadata: { domain } })
  return item
}

export async function removeBlockedDomain(admin, id) {
  const item = await BlockedDomain.findByIdAndDelete(id)
  if (!item) throw new AppError(404, 'DOMAIN_NOT_FOUND', 'Blocked domain not found.')
  await writeAuditLog({ actorId: admin._id, action: 'admin.domain_block.delete', resourceType: 'blocked_domain', resourceId: item._id, metadata: { domain: item.domain } })
}

export async function getPlatformSettings() {
  const settings = await PlatformSetting.findOne({ key: 'platform' }).lean()
  return settings || { allowRegistration: true, maintenanceMode: false, defaultLinkLimit: 1000 }
}

export async function updatePlatformSettings(admin, changes) {
  const session = await mongoose.startSession()
  let settings
  try {
    await session.withTransaction(async () => {
      settings = await PlatformSetting.findOneAndUpdate(
        { key: 'platform' },
        { $set: { ...changes, updatedBy: admin._id } },
        { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true, session },
      )
      await writeAuditLog({ actorId: admin._id, action: 'admin.platform_settings.update', resourceType: 'platform_settings', resourceId: settings._id, metadata: changes }, { session })
    })
  } finally { await session.endSession() }
  return settings
}

export async function listAuditLogs(query, pagination) {
  const filter = {}
  if (query.action) filter.action = query.action
  if (query.resourceType) filter.resourceType = query.resourceType
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ occurredAt: -1 }).skip(pagination.skip).limit(pagination.limit)
      .populate('actorId', 'name email').populate('targetUserId', 'name email').lean(),
    AuditLog.countDocuments(filter),
  ])
  return { items, pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) } }
}
