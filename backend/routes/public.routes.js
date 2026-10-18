import { Router } from 'express'
import { abuseReportLimiter } from '../middleware/security.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/errors.js'
import { abuseReportSchema } from '../validators/schemas.js'
import { getPublicBio } from '../services/resource.service.js'
import { submitAbuseReport } from '../services/link.service.js'

const router = Router()

router.get('/bio/:slug', asyncHandler(async (req, res) => {
  const page = await getPublicBio(req.params.slug)
  if (!page) return res.status(404).json({ error: { code: 'BIO_NOT_FOUND', message: 'This page is unavailable.' } })
  return res.json({ bioPage: page })
}))

router.post('/reports', abuseReportLimiter, validate({ body: abuseReportSchema }), asyncHandler(async (req, res) => {
  const report = await submitAbuseReport(req.body)
  res.status(201).json({ report: { id: report._id, status: report.status } })
}))

export default router
