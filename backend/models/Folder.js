import mongoose from 'mongoose'

const folderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
}, { timestamps: true, strict: 'throw' })

folderSchema.index({ userId: 1, name: 1 }, { unique: true })
folderSchema.index({ userId: 1, parentId: 1 })
export const Folder = mongoose.model('Folder', folderSchema)
