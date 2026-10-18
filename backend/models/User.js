import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user', immutable: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  plan: { type: String, enum: ['starter', 'growth', 'pro'], default: 'starter' },
  resetTokenHash: { type: String, select: false },
  resetExpiresAt: { type: Date, select: false },
  emailVerifiedAt: Date,
  lastLoginAt: Date,
  preferences: {
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    emailUpdates: { type: Boolean, default: true },
    weeklySummary: { type: Boolean, default: false },
  },
}, { timestamps: true, strict: 'throw' })

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ createdAt: -1 })

export const User = mongoose.model('User', userSchema)
