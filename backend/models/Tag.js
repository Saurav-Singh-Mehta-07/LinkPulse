import mongoose from 'mongoose'

const tagSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 48 },
  color: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: '#73e2c1' },
}, { timestamps: true, strict: 'throw' })

tagSchema.index({ userId: 1, name: 1 }, { unique: true })
export const Tag = mongoose.model('Tag', tagSchema)
