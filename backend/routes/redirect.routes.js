import { Router } from 'express'
import { env } from '../config/env.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/errors.js'
import { codeParamsSchema } from '../validators/schemas.js'
import { getRedirectState, recordClickAndGetDestination } from '../services/link.service.js'

const router = Router()

function redirectToUi(res, state, code) {
  const frontend = new URL(state === 'password_required' ? '/s/locked' : `/link/${state}`, env.FRONTEND_URL)
  if (state === 'password_required') frontend.searchParams.set('code', code)
  return res.redirect(frontend.toString())
}

router.get('/:code', validate({ params: codeParamsSchema }), asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store')
  const unlockCookie = req.cookies?.[`lp_unlock_${req.params.code}`]
  const state = await getRedirectState(req.params.code, unlockCookie)
  if (state.state === 'ready') {
    const result = await recordClickAndGetDestination(state.link._id, req)
    if (!result.unavailable) return res.redirect(302, result.destination)
    const latest = await getRedirectState(req.params.code, unlockCookie)
    return redirectToUi(res, latest.state, req.params.code)
  }
  return redirectToUi(res, state.state, req.params.code)
}))

export default router
