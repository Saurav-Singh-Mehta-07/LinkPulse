import mongoose from 'mongoose'

const blockedDomainSchema = new mongoose.Schema({
  domain: { type: String, required: true, lowercase: true, trim: true, maxlength: 253 },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true, strict: 'throw' })

blockedDomainSchema.index({ domain: 1 }, { unique: true })
export const BlockedDomain = mongoose.model('BlockedDomain', blockedDomainSchema)
