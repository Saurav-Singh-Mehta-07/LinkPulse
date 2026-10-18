import { AuditLog } from '../models/AuditLog.js'

export function writeAuditLog({
  actorId = null, action, resourceType, resourceId = null, targetUserId = null, outcome = 'success', metadata = {},
}, options = {}) {
  return AuditLog.create([{
    actorId, action, resourceType, resourceId: resourceId?.toString?.() || resourceId,
    targetUserId, outcome, metadata,
  }], options).then(([log]) => log)
}
