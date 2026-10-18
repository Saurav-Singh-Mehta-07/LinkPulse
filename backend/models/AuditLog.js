import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  action: { type: String, required: true, maxlength: 120 },
  resourceType: { type: String, required: true, maxlength: 80 },
  resourceId: { type: String, maxlength: 128, default: null },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  outcome: { type: String, enum: ['success', 'failure'], default: 'success' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  occurredAt: { type: Date, default: Date.now, required: true },
}, { timestamps: false, strict: 'throw' })

auditLogSchema.index({ occurredAt: -1 })
auditLogSchema.index({ resourceType: 1, resourceId: 1, occurredAt: -1 })
export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
