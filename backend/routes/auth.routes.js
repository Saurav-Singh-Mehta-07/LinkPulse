import { Router } from 'express'
import { authenticate, optionalAuthenticate } from '../middleware/auth.js'
import { authLimiter, passwordResetLimiter, registrationLimiter } from '../middleware/security.js'
import { validate } from '../middleware/validate.js'
import { cookieOptions } from '../utils/http.js'
import { asyncHandler } from '../utils/errors.js'
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../validators/schemas.js'
import { getCurrentUser, login, logout, register, requestPasswordReset, resetPassword } from '../services/auth.service.js'

const router = Router()
const clearCookie = (res, name) => res.clearCookie(name, cookieOptions())

router.post('/register', registrationLimiter, validate({ body: registerSchema }), asyncHandler(async (req, res) => {
  const result = await register(req.body, req)
  res.cookie('lp_session', result.sessionToken, cookieOptions(result.expiresAt.getTime() - Date.now()))
  res.status(201).json({ user: result.user })
}))

router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  const result = await login(req.body, req)
  res.cookie('lp_session', result.sessionToken, cookieOptions(result.expiresAt.getTime() - Date.now()))
  res.json({ user: result.user })
}))

router.post('/logout', authLimiter, optionalAuthenticate, asyncHandler(async (req, res) => {
  await logout(req.auth, req.cookies?.lp_session)
  clearCookie(res, 'lp_session')
  clearCookie(res, 'lp_csrf')
  res.status(204).end()
}))

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ user: await getCurrentUser(req.auth.user._id) })
}))

router.post('/password/forgot', passwordResetLimiter, validate({ body: forgotPasswordSchema }), asyncHandler(async (req, res) => {
  await requestPasswordReset(req.body.email)
  res.status(202).json({ message: 'If an account exists for that address, password reset instructions have been sent.' })
}))

router.post('/password/reset', passwordResetLimiter, validate({ body: resetPasswordSchema }), asyncHandler(async (req, res) => {
  await resetPassword(req.body)
  clearCookie(res, 'lp_session')
  res.json({ message: 'Password updated. Please sign in with your new password.' })
}))

export default router
