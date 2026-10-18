import mongoose from 'mongoose'
import { ClickEvent } from '../models/ClickEvent.js'
import { Link } from '../models/Link.js'
import { Campaign } from '../models/Campaign.js'
import { AbuseReport } from '../models/AbuseReport.js'
import { parseDateRange } from '../utils/pagination.js'
import { AppError } from '../utils/errors.js'

function rangeFilter(query, extra = {}) {
  const range = parseDateRange(query)
  if (range.error) throw new AppError(400, 'INVALID_DATE_RANGE', range.error)
  return {
    ...extra,
    occurredAt: { $gte: range.start, $lte: range.end },
    ...(query.campaignId ? { campaignId: new mongoose.Types.ObjectId(query.campaignId) } : {}),
    ...(query.linkId ? { linkId: new mongoose.Types.ObjectId(query.linkId) } : {}),
  }
}

function safeCount(value) {
  return Array.isArray(value) ? value.length : 0
}

export async function getAnalytics(userId, query = {}) {
  const match = rangeFilter(query, { ownerId: new mongoose.Types.ObjectId(userId) })
  const [timeline, sources, devices, browsers, topLinks, campaignResults, uniqueVisitors, activeLinks, expiringLinks] = await Promise.all([
    ClickEvent.aggregate([
      { $match: match },
      { $group: { _id: { $dateTrunc: { date: '$occurredAt', unit: query.groupBy || 'day' } }, clicks: { $sum: 1 }, visitors: { $addToSet: '$visitorKey' } } },
      { $project: { date: '$_id', clicks: 1, uniqueVisitors: { $size: '$visitors' } } },
      { $sort: { date: 1 } },
    ]),
    ClickEvent.aggregate([{ $match: match }, { $group: { _id: '$referrerHost', clicks: { $sum: 1 } } }, { $sort: { clicks: -1 } }, { $limit: 20 }]),
    ClickEvent.aggregate([{ $match: match }, { $group: { _id: '$device', clicks: { $sum: 1 } } }, { $sort: { clicks: -1 } }]),
    ClickEvent.aggregate([{ $match: match }, { $group: { _id: '$browser', clicks: { $sum: 1 } } }, { $sort: { clicks: -1 } }]),
    ClickEvent.aggregate([
      { $match: match },
      { $group: { _id: '$linkId', clicks: { $sum: 1 }, visitors: { $addToSet: '$visitorKey' } } },
      { $sort: { clicks: -1 } }, { $limit: 10 },
      { $lookup: { from: Link.collection.name, localField: '_id', foreignField: '_id', as: 'link' } },
      { $unwind: '$link' },
      { $project: { _id: '$link._id', code: '$link.code', destination: '$link.destination', status: '$link.status', clicks: 1, uniqueVisitors: { $size: '$visitors' } } },
    ]),
    ClickEvent.aggregate([
      { $match: { ...match, campaignId: { $ne: null } } },
      { $group: { _id: '$campaignId', clicks: { $sum: 1 } } },
      { $lookup: { from: Campaign.collection.name, localField: '_id', foreignField: '_id', as: 'campaign' } },
      { $unwind: '$campaign' },
      { $project: { _id: 0, campaignId: '$_id', name: '$campaign.name', status: '$campaign.status', clicks: 1 } },
      { $sort: { clicks: -1 } },
    ]),
    ClickEvent.distinct('visitorKey', match).then(safeCount),
    Link.countDocuments({ userId, status: 'active', $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }),
    Link.find({ userId, status: 'active', expiresAt: { $gt: new Date(), $lte: new Date(Date.now() + 7 * 86400000) } }).select('code expiresAt').sort({ expiresAt: 1 }).limit(20).lean(),
  ])
  const totalClicks = timeline.reduce((sum, item) => sum + item.clicks, 0)
  return {
    range: { from: match.occurredAt.$gte, to: match.occurredAt.$lte, uniqueVisitorBucket: 'calendar-month pseudonymous estimate' },
    totalClicks, uniqueVisitors, activeLinks,
    clickTrend: timeline,
    sources: sources.map(({ _id, clicks }) => ({ source: _id, clicks })),
    devices: devices.map(({ _id, clicks }) => ({ device: _id, clicks })),
    browsers: browsers.map(({ _id, clicks }) => ({ browser: _id, clicks })),
    topLinks,
    campaigns: campaignResults,
    expiringLinks,
  }
}

export async function getCampaignAnalytics(userId, campaignId, query = {}) {
  const campaign = await Campaign.findOne({ _id: campaignId, userId }).lean()
  if (!campaign) throw new AppError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found.')
  const report = await getAnalytics(userId, { ...query, campaignId: campaign._id.toString() })
  return { campaign, ...report }
}

export async function getPlatformAnalytics(query = {}) {
  const match = rangeFilter(query)
  const [totalClicks, unique, activeLinks, totalLinks, activeUsers, newUsers, topSources, topCountries, clickTrend, flaggedLinks] = await Promise.all([
    ClickEvent.countDocuments(match),
    ClickEvent.distinct('visitorKey', match),
    Link.countDocuments({ status: 'active', $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }),
    Link.countDocuments(),
    mongoose.model('User').countDocuments({ status: 'active' }),
    mongoose.model('User').countDocuments({ createdAt: match.occurredAt }),
    ClickEvent.aggregate([{ $match: match }, { $group: { _id: '$referrerHost', clicks: { $sum: 1 } } }, { $sort: { clicks: -1 } }, { $limit: 20 }]),
    ClickEvent.aggregate([{ $match: { ...match, countryCode: { $ne: null } } }, { $group: { _id: '$countryCode', clicks: { $sum: 1 } } }, { $sort: { clicks: -1 } }, { $limit: 20 }]),
    ClickEvent.aggregate([
      { $match: match },
      { $group: { _id: { $dateTrunc: { date: '$occurredAt', unit: query.groupBy || 'day' } }, clicks: { $sum: 1 }, visitors: { $addToSet: '$visitorKey' } } },
      { $project: { date: '$_id', clicks: 1, uniqueVisitors: { $size: '$visitors' } } },
      { $sort: { date: 1 } },
    ]),
    AbuseReport.countDocuments({ status: { $in: ['open', 'reviewing'] } }),
  ])
  return {
    range: { from: match.occurredAt.$gte, to: match.occurredAt.$lte, uniqueVisitorBucket: 'calendar-month pseudonymous estimate' },
    totalClicks, uniqueVisitors: unique.length, activeLinks, totalLinks, activeUsers, newUsers, flaggedLinks,
    clickTrend,
    sources: topSources.map(({ _id, clicks }) => ({ source: _id, clicks })),
    countries: topCountries.map(({ _id, clicks }) => ({ countryCode: _id, clicks })),
  }
}
