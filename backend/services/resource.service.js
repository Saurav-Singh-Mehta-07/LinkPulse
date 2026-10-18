import mongoose from 'mongoose'
import { Campaign } from '../models/Campaign.js'
import { Folder } from '../models/Folder.js'
import { Tag } from '../models/Tag.js'
import { Link } from '../models/Link.js'
import { BioPage } from '../models/BioPage.js'
import { AppError } from '../utils/errors.js'
import { parseDestination } from '../utils/url.js'
import { writeAuditLog } from './audit.service.js'

export async function assertOwnedReferences(userId, { campaignId, folderId, tagIds } = {}) {
  const checks = []
  if (campaignId) checks.push(Campaign.exists({ _id: campaignId, userId, status: { $ne: 'archived' } }))
  if (folderId) checks.push(Folder.exists({ _id: folderId, userId }))
  if (tagIds?.length) checks.push(Tag.countDocuments({ _id: { $in: tagIds }, userId }).then((count) => count === new Set(tagIds.map(String)).size))
  const results = await Promise.all(checks)
  if (results.some((result) => !result)) throw new AppError(404, 'RELATED_RESOURCE_NOT_FOUND', 'A selected campaign, folder, or tag was not found in your workspace.')
}

export async function listOwnedResource(Model, userId, { page, limit, skip, sort = 'createdAt', order = 'desc' }) {
  const [items, total] = await Promise.all([
    Model.find({ userId }).sort({ [sort]: order === 'asc' ? 1 : -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Model.countDocuments({ userId }),
  ])
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
}

export async function createCampaign(userId, body) {
  return Campaign.create({ userId, ...body, ...(body.status === 'archived' ? { archivedAt: new Date() } : {}) })
}

export async function updateCampaign(userId, id, body) {
  if (body.status === 'archived') {
    const session = await mongoose.startSession()
    let campaign
    try {
      await session.withTransaction(async () => {
        campaign = await Campaign.findOneAndUpdate(
          { _id: id, userId, status: { $ne: 'archived' } },
          { $set: { ...body, archivedAt: new Date() } },
          { returnDocument: 'after', runValidators: true, session },
        )
        if (!campaign) throw new AppError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found.')
        await Link.updateMany({ userId, campaignId: id }, { $set: { campaignId: null } }, { session })
        await writeAuditLog({ actorId: userId, action: 'campaign.archive', resourceType: 'campaign', resourceId: id }, { session })
      })
    } finally { await session.endSession() }
    return campaign
  }
  const campaign = await Campaign.findOneAndUpdate({ _id: id, userId, status: { $ne: 'archived' } }, { $set: body }, { returnDocument: 'after', runValidators: true })
  if (!campaign) throw new AppError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found.')
  return campaign
}

export async function deleteCampaign(userId, id) {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const campaign = await Campaign.findOne({ _id: id, userId }).session(session)
      if (!campaign) throw new AppError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found.')
      await Link.updateMany({ userId, campaignId: id }, { $set: { campaignId: null } }, { session })
      campaign.status = 'archived'
      campaign.archivedAt = new Date()
      await campaign.save({ session })
      await writeAuditLog({ actorId: userId, action: 'campaign.archive', resourceType: 'campaign', resourceId: id }, { session })
    })
  } finally { await session.endSession() }
}

export async function createTag(userId, body) {
  return Tag.create({ userId, ...body })
}

export async function updateTag(userId, id, body) {
  const tag = await Tag.findOneAndUpdate({ _id: id, userId }, { $set: body }, { returnDocument: 'after', runValidators: true })
  if (!tag) throw new AppError(404, 'TAG_NOT_FOUND', 'Tag not found.')
  return tag
}

export async function deleteTag(userId, id) {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const tag = await Tag.findOne({ _id: id, userId }).session(session)
      if (!tag) throw new AppError(404, 'TAG_NOT_FOUND', 'Tag not found.')
      await Link.updateMany({ userId, tagIds: id }, { $pull: { tagIds: id } }, { session })
      await tag.deleteOne({ session })
      await writeAuditLog({ actorId: userId, action: 'tag.delete', resourceType: 'tag', resourceId: id }, { session })
    })
  } finally { await session.endSession() }
}

export async function createFolder(userId, body) {
  if (body.parentId && !(await Folder.exists({ _id: body.parentId, userId }))) throw new AppError(404, 'FOLDER_NOT_FOUND', 'Parent folder not found.')
  return Folder.create({ userId, ...body })
}

export async function updateFolder(userId, id, body) {
  if (body.parentId === id) throw new AppError(400, 'INVALID_PARENT', 'A folder cannot be its own parent.')
  if (body.parentId) {
    let parent = await Folder.findOne({ _id: body.parentId, userId }).select('parentId').lean()
    if (!parent) throw new AppError(404, 'FOLDER_NOT_FOUND', 'Parent folder not found.')
    const visited = new Set()
    while (parent) {
      const parentId = parent._id.toString()
      if (parentId === id) throw new AppError(400, 'INVALID_PARENT', 'A folder cannot be moved inside one of its descendants.')
      if (visited.has(parentId)) throw new AppError(409, 'FOLDER_HIERARCHY_INVALID', 'The existing folder hierarchy contains a cycle.')
      visited.add(parentId)
      if (visited.size > 100) throw new AppError(400, 'FOLDER_DEPTH_LIMIT', 'Folder nesting cannot exceed 100 levels.')
      parent = parent.parentId ? await Folder.findOne({ _id: parent.parentId, userId }).select('parentId').lean() : null
    }
  }
  const folder = await Folder.findOneAndUpdate({ _id: id, userId }, { $set: body }, { returnDocument: 'after', runValidators: true })
  if (!folder) throw new AppError(404, 'FOLDER_NOT_FOUND', 'Folder not found.')
  return folder
}

export async function deleteFolder(userId, id) {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const folder = await Folder.findOne({ _id: id, userId }).session(session)
      if (!folder) throw new AppError(404, 'FOLDER_NOT_FOUND', 'Folder not found.')
      await Link.updateMany({ userId, folderId: id }, { $set: { folderId: null } }, { session })
      await Folder.updateMany({ userId, parentId: id }, { $set: { parentId: null } }, { session })
      await folder.deleteOne({ session })
      await writeAuditLog({ actorId: userId, action: 'folder.delete', resourceType: 'folder', resourceId: id }, { session })
    })
  } finally { await session.endSession() }
}

export async function upsertBioPage(userId, body) {
  const links = body.links?.map((link) => ({ ...link, url: parseDestination(link.url) }))
  return BioPage.findOneAndUpdate({ userId }, {
    $set: { ...body, ...(links ? { links } : {}), userId },
  }, { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true })
}

export async function getBioPage(userId) {
  return BioPage.findOne({ userId }).lean()
}

export async function getPublicBio(slug) {
  const page = await BioPage.findOne({ slug, published: true }).select('slug displayName bio links theme').lean()
  if (page) page.links = page.links.filter((link) => link.enabled)
  return page
}
