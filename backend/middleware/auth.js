import { AuthSession } from '../models/AuthSession.js'
import { User } from '../models/User.js'
import { sha256 } from '../utils/crypto.js'
import { AppError, asyncHandler } from '../utils/errors.js'

export const authenticate = asyncHandler(async (req, _res, next) => {
  const rawToken = req.cookies?.lp_session
  if (!rawToken) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.')
  const session = await AuthSession.findOne({ tokenHash: sha256(rawToken), expiresAt: { $gt: new Date() } }).lean()
  if (!session) throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Sign in again.')
  const user = await User.findById(session.userId).select('name email role status plan').lean()
  if (!user || user.status !== 'active') throw new AppError(403, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable.')
  req.auth = { sessionId: session._id, user }
  next()
})

export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const rawToken = req.cookies?.lp_session
  if (!rawToken) return next()
  const session = await AuthSession.findOne({ tokenHash: sha256(rawToken), expiresAt: { $gt: new Date() } }).lean()
  if (!session) return next()
  const user = await User.findById(session.userId).select('name email role status plan').lean()
  if (user?.status === 'active') req.auth = { sessionId: session._id, user }
  return next()
})

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.auth?.user || !roles.includes(req.auth.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'))
    }
    return next()
  }
}
