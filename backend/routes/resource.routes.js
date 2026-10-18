import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/errors.js'
import { parsePagination } from '../utils/pagination.js'
import { campaignSchema, folderSchema, idParamsSchema, listQuerySchema, tagSchema, bioPageSchema } from '../validators/schemas.js'
import {
  createCampaign, createFolder, createTag, deleteCampaign, deleteFolder, deleteTag,
  getBioPage, listOwnedResource, updateCampaign, updateFolder, updateTag, upsertBioPage,
} from '../services/resource.service.js'
import { Campaign } from '../models/Campaign.js'
import { Folder } from '../models/Folder.js'
import { Tag } from '../models/Tag.js'

const router = Router()
router.use((req, res, next) => {
  if (/^\/(?:campaigns|tags|folders)(?:\/|$)/.test(req.path) || req.path === '/bio') {
    return authenticate(req, res, next)
  }
  return next('router')
})

router.get('/campaigns', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await listOwnedResource(Campaign, req.auth.user._id, parsePagination(req.validated.query)))
}))
router.post('/campaigns', validate({ body: campaignSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ campaign: await createCampaign(req.auth.user._id, req.body) })
}))
router.patch('/campaigns/:id', validate({ params: idParamsSchema, body: campaignSchema.partial() }), asyncHandler(async (req, res) => {
  res.json({ campaign: await updateCampaign(req.auth.user._id, req.params.id, req.body) })
}))
router.delete('/campaigns/:id', validate({ params: idParamsSchema }), asyncHandler(async (req, res) => {
  await deleteCampaign(req.auth.user._id, req.params.id)
  res.status(204).end()
}))

router.get('/tags', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await listOwnedResource(Tag, req.auth.user._id, parsePagination(req.validated.query)))
}))
router.post('/tags', validate({ body: tagSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ tag: await createTag(req.auth.user._id, req.body) })
}))
router.patch('/tags/:id', validate({ params: idParamsSchema, body: tagSchema.partial() }), asyncHandler(async (req, res) => {
  res.json({ tag: await updateTag(req.auth.user._id, req.params.id, req.body) })
}))
router.delete('/tags/:id', validate({ params: idParamsSchema }), asyncHandler(async (req, res) => {
  await deleteTag(req.auth.user._id, req.params.id)
  res.status(204).end()
}))

router.get('/folders', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await listOwnedResource(Folder, req.auth.user._id, parsePagination(req.validated.query)))
}))
router.post('/folders', validate({ body: folderSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ folder: await createFolder(req.auth.user._id, req.body) })
}))
router.patch('/folders/:id', validate({ params: idParamsSchema, body: folderSchema.partial() }), asyncHandler(async (req, res) => {
  res.json({ folder: await updateFolder(req.auth.user._id, req.params.id, req.body) })
}))
router.delete('/folders/:id', validate({ params: idParamsSchema }), asyncHandler(async (req, res) => {
  await deleteFolder(req.auth.user._id, req.params.id)
  res.status(204).end()
}))

router.get('/bio', asyncHandler(async (req, res) => {
  res.json({ bioPage: await getBioPage(req.auth.user._id) })
}))
router.put('/bio', validate({ body: bioPageSchema }), asyncHandler(async (req, res) => {
  res.json({ bioPage: await upsertBioPage(req.auth.user._id, req.body) })
}))

export default router
