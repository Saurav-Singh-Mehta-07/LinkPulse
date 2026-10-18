import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid resource id.')
const optionalDate = z.union([z.string().datetime({ offset: true }), z.literal(''), z.null()]).optional()
const safeDestination = z.string().trim().min(1).max(2048).url().refine((value) => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}, 'Only http and https URLs without embedded credentials are allowed.')

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
}).strict()

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict()

export const forgotPasswordSchema = z.object({ email: z.string().trim().email().max(254) }).strict()
export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(128),
}).strict()

export const createLinkSchema = z.object({
  destination: safeDestination,
  alias: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  title: z.string().trim().max(160).optional(),
  campaignId: objectId.nullable().optional(),
  folderId: objectId.nullable().optional(),
  tagIds: z.array(objectId).max(30).optional(),
  expiresAt: optionalDate,
  maxClicks: z.number().int().min(1).nullable().optional(),
  password: z.string().min(6).max(128).nullable().optional(),
  qrEnabled: z.boolean().optional(),
}).strict()

export const updateLinkSchema = createLinkSchema.partial().extend({
  status: z.enum(['active', 'disabled']).optional(),
}).strict()

export const idParamsSchema = z.object({ id: objectId }).strict()
export const codeParamsSchema = z.object({ code: z.string().min(3).max(32).regex(/^[a-z0-9_-]+$/i) }).strict()
export const aliasParamsSchema = z.object({ alias: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/) }).strict()

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(200).optional(),
  status: z.enum(['active', 'disabled', 'taken_down', 'expired', 'all']).optional(),
  campaignId: objectId.optional(),
  folderId: objectId.optional(),
  tagId: objectId.optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'clickCount', 'code']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
}).strict()

export const campaignSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  startsAt: optionalDate,
  endsAt: optionalDate,
}).strict()

export const tagSchema = z.object({
  name: z.string().trim().min(1).max(48),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
}).strict()

export const folderSchema = z.object({
  name: z.string().trim().min(1).max(100),
  parentId: objectId.nullable().optional(),
}).strict()

export const bioPageSchema = z.object({
  slug: z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9][a-z0-9_-]+$/),
  displayName: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(500).optional(),
  links: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    url: safeDestination,
    enabled: z.boolean().optional(),
  }).strict()).max(50).optional(),
  theme: z.enum(['dark', 'light']).optional(),
  published: z.boolean().optional(),
}).strict()

export const domainSchema = z.object({
  domain: z.string().trim().min(3).max(253),
  reason: z.string().trim().min(1).max(500),
}).strict()
export const abuseReportSchema = z.object({
  code: z.string().trim().min(3).max(32).regex(/^[a-z0-9_-]+$/i),
  reason: z.enum(['phishing', 'malware', 'spam', 'impersonation', 'other']),
  details: z.string().trim().max(1000).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
}).strict()
export const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(200).optional(),
  status: z.enum(['active', 'suspended', 'all']).optional(),
}).strict()
export const platformSettingsSchema = z.object({
  allowRegistration: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  defaultLinkLimit: z.number().int().min(1).max(100000).optional(),
}).strict()
export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  action: z.string().trim().max(120).optional(),
  resourceType: z.string().trim().max(80).optional(),
}).strict()

export const adminUserUpdateSchema = z.object({
  status: z.enum(['active', 'suspended']),
}).strict()
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(254).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, 'Provide a profile field to update.')
export const preferencesSchema = z.object({
  theme: z.enum(['dark', 'light']).optional(),
  emailUpdates: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, 'Provide a preference to update.')

export const reviewSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict()
export const abuseReviewSchema = z.object({
  status: z.enum(['reviewing', 'resolved', 'dismissed']),
  resolution: z.string().trim().max(500).optional().default(''),
}).strict()
export const adminReportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['open', 'reviewing', 'resolved', 'dismissed', 'all']).optional(),
}).strict()

export const clickQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  campaignId: objectId.optional(),
  linkId: objectId.optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
}).strict()

export const importRowSchema = z.object({
  destination: safeDestination,
  alias: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional().or(z.literal('')),
  title: z.string().trim().max(160).optional(),
}).passthrough()
