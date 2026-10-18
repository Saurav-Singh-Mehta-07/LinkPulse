import { Router } from 'express'
import multer from 'multer'
import Papa from 'papaparse'
import { env } from '../config/env.js'
import { authenticate } from '../middleware/auth.js'
import { authLimiter, importLimiter } from '../middleware/security.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler, AppError } from '../utils/errors.js'
import { parsePagination } from '../utils/pagination.js'
import { codeParamsSchema, createLinkSchema, idParamsSchema, importRowSchema, listQuerySchema, updateLinkSchema } from '../validators/schemas.js'
import { createLink, deleteLink, getOwnedLink, listLinks, serializeLink, unlockLink, updateLink } from '../services/link.service.js'
import { getAnalytics } from '../services/analytics.service.js'
import { aliasParamsSchema, clickQuerySchema } from '../validators/schemas.js'
import { Link } from '../models/Link.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 2 },
  fileFilter(_req, file, callback) {
    if (!file.originalname.toLowerCase().endsWith('.csv')) return callback(new AppError(415, 'CSV_REQUIRED', 'Upload a .csv file.'))
    callback(null, true)
  },
})

router.post('/public/:code/unlock', authLimiter, validate({ params: codeParamsSchema }), asyncHandler(async (req, res) => {
  const password = req.body?.password
  if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Enter a valid link password.')
  }
  const unlock = await unlockLink(req.params.code, password)
  res.cookie(`lp_unlock_${req.params.code}`, unlock.token, {
    httpOnly: true, secure: env.cookieSecure, sameSite: 'strict', path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    maxAge: unlock.maxAge,
  })
  res.json({ unlocked: true })
}))

router.use(authenticate)

router.get('/', validate({ query: listQuerySchema }), asyncHandler(async (req, res) => {
  const query = req.validated.query
  res.json(await listLinks(req.auth.user._id, query, parsePagination(query)))
}))

router.post('/', validate({ body: createLinkSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ link: await createLink(req.auth.user._id, req.body) })
}))

router.post('/import', importLimiter, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'CSV_REQUIRED', 'Choose a CSV file to import.')
  const parsed = Papa.parse(req.file.buffer.toString('utf8').replace(/^\uFEFF/, ''), {
    header: true, skipEmptyLines: 'greedy', transformHeader: (header) => header.trim().toLowerCase(),
  })
  if (parsed.errors.length) {
    throw new AppError(400, 'CSV_PARSE_ERROR', 'The CSV file could not be parsed.', parsed.errors.slice(0, 20).map(({ row, message }) => ({ row: row + 1, message })))
  }
  const headers = parsed.meta.fields || []
  if (!headers.some((header) => ['destination', 'url', 'long_url'].includes(header))) {
    throw new AppError(400, 'CSV_HEADERS_INVALID', 'CSV must include a destination, url, or long_url column.')
  }
  if (!parsed.data.length) throw new AppError(400, 'CSV_EMPTY', 'The CSV file contains no data rows.')
  if (parsed.data.length > 1000) throw new AppError(413, 'CSV_ROW_LIMIT', 'A single import may contain at most 1000 data rows.')
  const results = []
  for (const [index, rawRow] of parsed.data.entries()) {
    const row = {
      destination: rawRow.destination || rawRow.url || rawRow.long_url || '',
      ...(rawRow.alias !== undefined ? { alias: rawRow.alias } : {}),
      ...(rawRow.title !== undefined ? { title: rawRow.title } : {}),
    }
    const validated = importRowSchema.safeParse(row)
    if (!validated.success) {
      results.push({ row: index + 2, status: 'invalid', errors: validated.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) })
      continue
    }
    try {
      const link = await createLink(req.auth.user._id, { ...validated.data, alias: validated.data.alias || undefined })
      results.push({ row: index + 2, status: 'created', link })
    } catch (error) {
      if (error.status || error.code === 11000) {
        results.push({ row: index + 2, status: 'invalid', errors: [{ field: 'row', message: error.message || 'This alias is already in use.' }] })
      } else throw error
    }
  }
  const created = results.filter((row) => row.status === 'created').length
  res.status(created === results.length ? 201 : 207).json({
    total: results.length, created, invalid: results.length - created, results,
  })
}))

router.get('/alias/:alias/availability', validate({ params: aliasParamsSchema }), asyncHandler(async (req, res) => {
  const exists = await Link.exists({ code: req.params.alias.toLowerCase() })
  res.json({ alias: req.params.alias.toLowerCase(), available: !exists })
}))

router.get('/:id/qr', validate({ params: idParamsSchema }), asyncHandler(async (req, res) => {
  const link = await getOwnedLink(req.auth.user._id, req.params.id)
  if (!link.qrEnabled) throw new AppError(409, 'QR_DISABLED', 'QR codes are disabled for this link.')
  res.json({ code: link.code, url: new URL(`/${link.code}`, env.PUBLIC_SHORT_DOMAIN).toString(), format: 'png-or-svg-client-side' })
}))

router.get('/:id/analytics', validate({ params: idParamsSchema, query: clickQuerySchema }), asyncHandler(async (req, res) => {
  const link = await getOwnedLink(req.auth.user._id, req.params.id)
  res.json(await getAnalytics(req.auth.user._id, { ...req.validated.query, linkId: link._id.toString() }))
}))

router.get('/:id', validate({ params: idParamsSchema }), asyncHandler(async (req, res) => {
  res.json({ link: serializeLink(await getOwnedLink(req.auth.user._id, req.params.id)) })
}))

router.patch('/:id', validate({ params: idParamsSchema, body: updateLinkSchema }), asyncHandler(async (req, res) => {
  res.json({ link: await updateLink(req.auth.user._id, req.params.id, req.body) })
}))

router.delete('/:id', validate({ params: idParamsSchema }), asyncHandler(async (req, res) => {
  res.json({ link: await deleteLink(req.auth.user._id, req.params.id) })
}))

export default router
