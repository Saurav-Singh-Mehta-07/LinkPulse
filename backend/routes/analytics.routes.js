import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/errors.js'
import { clickQuerySchema, idParamsSchema } from '../validators/schemas.js'
import { getAnalytics, getCampaignAnalytics } from '../services/analytics.service.js'

const router = Router()
router.use(authenticate)

router.get('/', validate({ query: clickQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await getAnalytics(req.auth.user._id, req.validated.query))
}))
router.get('/campaigns/:id', validate({ params: idParamsSchema, query: clickQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await getCampaignAnalytics(req.auth.user._id, req.params.id, req.validated.query))
}))

export default router
