import { Router } from 'express'
import { User } from '../models/User.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { AppError, asyncHandler } from '../utils/errors.js'
import { profileSchema, preferencesSchema } from '../validators/schemas.js'
import { writeAuditLog } from '../services/audit.service.js'

const router = Router()
router.use(authenticate)

router.get('/profile', asyncHandler(async (req, res) => {
  const profile = await User.findById(req.auth.user._id).select('name email role plan status createdAt preferences').lean()
  if (!profile) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.')
  res.json({ profile })
}))

router.patch('/profile', validate({ body: profileSchema }), asyncHandler(async (req, res) => {
  const changes = { ...req.body }
  if (changes.email) changes.email = changes.email.toLowerCase()
  const profile = await User.findOneAndUpdate(
    { _id: req.auth.user._id, status: 'active' },
    { $set: changes },
    { returnDocument: 'after', runValidators: true },
  ).select('name email role plan status createdAt preferences')
  if (!profile) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.')
  await writeAuditLog({ actorId: profile._id, action: 'account.profile.update', resourceType: 'user', resourceId: profile._id })
  res.json({ profile })
}))

router.get('/preferences', asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.user._id).select('preferences').lean()
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.')
  res.json({ preferences: user.preferences || { theme: 'dark', emailUpdates: true, weeklySummary: false } })
}))

router.patch('/preferences', validate({ body: preferencesSchema }), asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.auth.user._id, status: 'active' },
    { $set: Object.fromEntries(Object.entries(req.body).map(([key, value]) => [`preferences.${key}`, value])) },
    { returnDocument: 'after', runValidators: true },
  ).select('preferences')
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.')
  await writeAuditLog({ actorId: user._id, action: 'account.preferences.update', resourceType: 'user', resourceId: user._id, metadata: req.body })
  res.json({ preferences: user.preferences })
}))

export default router
