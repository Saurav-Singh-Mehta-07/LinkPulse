import mongoose from 'mongoose'

const linkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null, index: true },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null, index: true },
  tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  destination: { type: String, required: true, maxlength: 2048 },
  code: { type: String, required: true, lowercase: true, minlength: 3, maxlength: 32 },
  customAlias: { type: Boolean, default: false },
  title: { type: String, trim: true, maxlength: 160, default: '' },
  status: { type: String, enum: ['active', 'disabled', 'taken_down'], default: 'active', index: true },
  expiresAt: { type: Date, default: null },
  maxClicks: { type: Number, min: 1, default: null },
  clickCount: { type: Number, min: 0, default: 0 },
  passwordHash: { type: String, select: false, default: null },
  qrEnabled: { type: Boolean, default: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  takenDownAt: Date,
  takenDownBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  takedownReason: { type: String, maxlength: 500 },
}, { timestamps: true, strict: 'throw' })

linkSchema.index({ code: 1 }, { unique: true })
linkSchema.index({ userId: 1, createdAt: -1 })
linkSchema.index({ userId: 1, status: 1, createdAt: -1 })
linkSchema.index({ campaignId: 1, createdAt: -1 })
linkSchema.index({ expiresAt: 1 }, { sparse: true })

export const Link = mongoose.model('Link', linkSchema)
