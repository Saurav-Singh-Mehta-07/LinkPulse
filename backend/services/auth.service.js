import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { AuthSession } from '../models/AuthSession.js'
import { User } from '../models/User.js'
import { writeAuditLog } from './audit.service.js'
import { hashPassword, randomToken, sha256, verifyPassword } from '../utils/crypto.js'
import { AppError } from '../utils/errors.js'
import { sendPasswordReset } from './mail.service.js'
import { PlatformSetting } from '../models/PlatformSetting.js'

function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, plan: user.plan, status: user.status }
}

export async function register({ name, email, password }, req) {
  const settings = await PlatformSetting.findOne({ key: 'platform' }).lean()
  if (settings?.maintenanceMode) throw new AppError(503, 'MAINTENANCE_MODE', 'Registration is temporarily unavailable.')
  if (settings?.allowRegistration === false) throw new AppError(403, 'REGISTRATION_CLOSED', 'New account registration is closed.')
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash: await hashPassword(password) })
  await writeAuditLog({ actorId: user._id, targetUserId: user._id, action: 'auth.register', resourceType: 'user', resourceId: user._id })
  const session = await createSession(user, req)
  return { user: publicUser(user), sessionToken: session.token, expiresAt: session.expiresAt }
}

export async function login({ email, password }, req) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')
  if (!user) await hashPassword(password)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await writeAuditLog({ action: 'auth.login', resourceType: 'user', outcome: 'failure', metadata: { email: email.toLowerCase() } })
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
  }
  if (user.status !== 'active') throw new AppError(403, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable.')
  const updated = await User.updateOne(
    { _id: user._id, status: 'active' },
    { $set: { lastLoginAt: new Date() } },
  )
  if (!updated.matchedCount) throw new AppError(403, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable.')
  const session = await createSession(user, req)
  await writeAuditLog({ actorId: user._id, action: 'auth.login', resourceType: 'session', resourceId: session.id })
  return { user: publicUser(user), sessionToken: session.token, expiresAt: session.expiresAt }
}

async function createSession(user, req) {
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  const session = await AuthSession.create({
    userId: user._id,
    tokenHash: sha256(token),
    expiresAt,
    userAgent: String(req.get('user-agent') || '').slice(0, 500),
  })
  return { id: session._id, token, expiresAt }
}

export async function logout(auth, rawToken) {
  if (rawToken) await AuthSession.deleteOne({ tokenHash: sha256(rawToken) })
  if (auth?.sessionId) {
    await writeAuditLog({ actorId: auth.user._id, action: 'auth.logout', resourceType: 'session', resourceId: auth.sessionId })
  }
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId).select('name email role plan status createdAt')
  if (!user || user.status !== 'active') throw new AppError(401, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable.')
  return publicUser(user)
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user || user.status !== 'active') return
  const token = randomToken(32)
  const tokenHash = sha256(token)
  const resetExpiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000)
  const updated = await User.updateOne(
    { _id: user._id, status: 'active' },
    { $set: { resetTokenHash: tokenHash, resetExpiresAt } },
  )
  if (!updated.matchedCount) return
  try {
    await sendPasswordReset(user.email, token)
  } catch (error) {
    await User.updateOne(
      { _id: user._id, resetTokenHash: tokenHash },
      { $unset: { resetTokenHash: 1, resetExpiresAt: 1 } },
    )
    throw error
  }
  await writeAuditLog({ actorId: user._id, action: 'auth.password_reset.request', resourceType: 'user', resourceId: user._id })
}

export async function resetPassword({ token, password }) {
  const passwordHash = await hashPassword(password)
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const user = await User.findOneAndUpdate({
        resetTokenHash: sha256(token),
        resetExpiresAt: { $gt: new Date() },
        status: 'active',
      }, {
        $set: { passwordHash },
        $unset: { resetTokenHash: 1, resetExpiresAt: 1 },
      }, { returnDocument: 'after', session })
      if (!user) throw new AppError(400, 'RESET_TOKEN_INVALID', 'Password reset link is invalid or has expired.')
      await AuthSession.deleteMany({ userId: user._id }, { session })
      await writeAuditLog({ actorId: user._id, action: 'auth.password_reset.complete', resourceType: 'user', resourceId: user._id }, { session })
    })
  } finally { await session.endSession() }
}
