import mongoose from 'mongoose'

const authSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  userAgent: { type: String, maxlength: 500 },
}, { timestamps: true, strict: 'throw' })

export const AuthSession = mongoose.model('AuthSession', authSessionSchema)
