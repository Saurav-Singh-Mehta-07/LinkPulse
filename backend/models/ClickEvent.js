import mongoose from 'mongoose'

const clickEventSchema = new mongoose.Schema({
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  occurredAt: { type: Date, required: true, default: Date.now },
  visitorKey: { type: String, required: true, select: false },
  referrerHost: { type: String, maxlength: 253, default: 'direct' },
  device: { type: String, enum: ['desktop', 'mobile', 'tablet', 'other'], default: 'other' },
  browser: { type: String, maxlength: 32, default: 'Other' },
  countryCode: { type: String, maxlength: 2, default: null },
  isBot: { type: Boolean, default: false },
}, { timestamps: false, strict: 'throw' })

clickEventSchema.index({ linkId: 1, occurredAt: -1 })
clickEventSchema.index({ ownerId: 1, occurredAt: -1 })
clickEventSchema.index({ campaignId: 1, occurredAt: -1 })
clickEventSchema.index({ ownerId: 1, visitorKey: 1, occurredAt: -1 })

export const ClickEvent = mongoose.model('ClickEvent', clickEventSchema)
