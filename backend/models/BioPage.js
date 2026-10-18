import mongoose from 'mongoose'

const bioLinkSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  url: { type: String, required: true, maxlength: 2048 },
  enabled: { type: Boolean, default: true },
}, { _id: true, strict: 'throw' })

const bioPageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  slug: { type: String, required: true, lowercase: true, match: /^[a-z0-9][a-z0-9_-]{2,31}$/ },
  displayName: { type: String, required: true, trim: true, maxlength: 100 },
  bio: { type: String, trim: true, maxlength: 500, default: '' },
  links: { type: [bioLinkSchema], default: [], validate: [(value) => value.length <= 50, 'A bio page may have at most 50 links.'] },
  theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
  published: { type: Boolean, default: false },
}, { timestamps: true, strict: 'throw' })

bioPageSchema.index({ slug: 1 }, { unique: true })
export const BioPage = mongoose.model('BioPage', bioPageSchema)
