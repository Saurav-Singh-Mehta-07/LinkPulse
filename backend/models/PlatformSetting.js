import mongoose from 'mongoose'

const platformSettingSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'platform', immutable: true },
  allowRegistration: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  defaultLinkLimit: { type: Number, min: 1, max: 100000, default: 1000 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  adminBootstrapClaimedAt: { type: Date, default: null },
  adminBootstrapAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, strict: 'throw' })

export const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema)
