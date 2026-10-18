import mongoose from 'mongoose'

const abuseReportSchema = new mongoose.Schema({
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', default: null, index: true },
  code: { type: String, required: true, lowercase: true, maxlength: 32 },
  reporterEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  reason: { type: String, enum: ['phishing', 'malware', 'spam', 'impersonation', 'other'], required: true },
  details: { type: String, maxlength: 1000, default: '' },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: Date,
  resolution: { type: String, maxlength: 500, default: '' },
}, { timestamps: true, strict: 'throw' })

abuseReportSchema.index({ status: 1, createdAt: -1 })

export const AbuseReport = mongoose.model('AbuseReport', abuseReportSchema)
