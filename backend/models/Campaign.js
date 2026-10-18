import mongoose from 'mongoose'

const campaignSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['active', 'paused', 'archived'], default: 'active' },
  startsAt: Date,
  endsAt: Date,
  archivedAt: Date,
}, { timestamps: true, strict: 'throw' })

campaignSchema.index({ userId: 1, name: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } })
campaignSchema.index({ userId: 1, updatedAt: -1 })

export const Campaign = mongoose.model('Campaign', campaignSchema)
