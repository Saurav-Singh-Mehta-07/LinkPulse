import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: ['backend/.env', '.env'] })

const httpUrl = z.string().url().refine((value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
})
const shortDomain = httpUrl.refine((value) => {
  const parsed = new URL(value)
  return parsed.pathname === '/' && !parsed.search && !parsed.hash
}, 'PUBLIC_SHORT_DOMAIN must be an origin without a path, query, or fragment.')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  FRONTEND_URL: httpUrl.default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().optional().default(''),
  SESSION_SECRET: z.string().min(32).optional(),
  COOKIE_DOMAIN: z.string().optional().default(''),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(30),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('LinkPulse <no-reply@example.com>'),
  PUBLIC_SHORT_DOMAIN: shortDomain.default('http://localhost:4000'),
})

export function parseEnv(source = process.env) {
  const parsed = schema.safeParse(source)
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    throw new Error(`Invalid backend environment configuration: ${details}`)
  }
  const env = parsed.data
  env.corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  env.cookieSecure = env.NODE_ENV === 'production'
  env.smtpSecure = env.SMTP_SECURE === 'true'
  return env
}

export const env = parseEnv()

export function assertRuntimeConfig(config = env) {
  if (!config.SESSION_SECRET && config.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set to a random value of at least 32 characters in production.')
  }
  if (!config.SESSION_SECRET && config.NODE_ENV !== 'production') {
    config.SESSION_SECRET = 'linkpulse-development-only-secret-rotate-this'
  }
  if (config.NODE_ENV === 'production' && config.corsOrigins.includes('*')) {
    throw new Error('Wildcard CORS origins are not permitted in production.')
  }
  return config
}
