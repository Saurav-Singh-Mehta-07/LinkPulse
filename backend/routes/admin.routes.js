import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler, AppError } from '../utils/errors.js'
import { parsePagination } from '../utils/pagination.js'
import {
  abuseReviewSchema, adminReportQuerySchema, adminUserQuerySchema, clickQuerySchema,
  adminUserUpdateSchema, auditLogQuerySchema, domainSchema, idParamsSchema, listQuerySchema, platformSettingsSchema, reviewSchema,
} from '../validators/schemas.js'
import { getPlatformAnalytics } from '../services/analytics.service.js'
import { listGlobalLinks, moderateLink } from '../services/link.service.js'
import {
  addBlockedDomain, getPlatformSettings, listAbuseReports, listAuditLogs, listBlockedDomains,
  listUsers, removeBlockedDomain, reviewAbuseReport, setUserStatus, updatePlatformSettings,
} from '../services/admin.service.js'

const router = Router()
router.use(authenticate, requireRole('admin'))

router.get('/analytics', validate({ query: clickQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await getPlatformAnalytics(req.validated.query))
}))
router.get('/links', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  const query = req.validated.query
  res.json(await listGlobalLinks(query, parsePagination(query)))
}))
router.patch('/links/:id/takedown', validate({ params: idParamsSchema, body: reviewSchema }), asyncHandler(async (req, res) => {
  res.json({ link: await moderateLink(req.auth.user, req.params.id, req.body.reason, 'taken_down') })
}))
router.patch('/links/:id/restore', validate({ params: idParamsSchema, body: reviewSchema }), asyncHandler(async (req, res) => {
  res.json({ link: await moderateLink(req.auth.user, req.params.id, req.body.reason, 'active') })
}))

router.get('/users', validate({ query: adminUserQuerySchema }), asyncHandler(async (req, res) => {
  const query = req.validated.query
  res.json(await listUsers(query, parsePagination(query)))
}))
router.patch('/users/:id/status', validate({ params: idParamsSchema, body: adminUserUpdateSchema }), asyncHandler(async (req, res) => {
  res.json({ user: await setUserStatus(req.auth.user, req.params.id, req.body.status) })
}))

router.get('/abuse-reports', validate({ query: adminReportQuerySchema }), asyncHandler(async (req, res) => {
  const query = req.validated.query
  res.json(await listAbuseReports(query, parsePagination(query)))
}))
router.patch('/abuse-reports/:id', validate({ params: idParamsSchema, body: abuseReviewSchema }), asyncHandler(async (req, res) => {
  res.json({ report: await reviewAbuseReport(req.auth.user, req.params.id, req.body.status, req.body.resolution) })
}))

router.get('/blocked-domains', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await listBlockedDomains(parsePagination(req.validated.query)))
}))
router.post('/blocked-domains', validate({ body: domainSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ domain: await addBlockedDomain(req.auth.user, req.body) })
}))
router.delete('/blocked-domains/:id', validate({ params: idParamsSchema }), asyncHandler(async (req, res) => {
  await removeBlockedDomain(req.auth.user, req.params.id)
  res.status(204).end()
}))

router.get('/settings', asyncHandler(async (_req, res) => {
  res.json({ settings: await getPlatformSettings() })
}))
router.patch('/settings', validate({ body: platformSettingsSchema }), asyncHandler(async (req, res) => {
  if (!Object.keys(req.body).length) throw new AppError(400, 'EMPTY_UPDATE', 'Provide at least one setting to update.')
  res.json({ settings: await updatePlatformSettings(req.auth.user, req.body) })
}))

router.get('/audit-logs', validate({ query: auditLogQuerySchema }), asyncHandler(async (req, res) => {
  const query = req.validated.query
  res.json(await listAuditLogs(query, parsePagination(query)))
}))

export default router
