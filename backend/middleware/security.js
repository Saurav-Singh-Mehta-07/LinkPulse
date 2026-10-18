import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'
import { AppError } from '../utils/errors.js'
import { verifyValue } from '../utils/crypto.js'
import { clientCookieOptions } from '../utils/http.js'
import { randomToken, signValue } from '../utils/crypto.js'

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true)
    return callback(new AppError(403, 'CORS_ORIGIN_DENIED', 'This origin is not allowed.'), false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  maxAge: 600,
})

export function issueCsrf(req, res) {
  const nonce = randomToken(24)
  const token = signValue(nonce, 'csrf')
  res.cookie('lp_csrf', token, clientCookieOptions(24 * 60 * 60 * 1000))
  res.set('Cache-Control', 'no-store')
  return res.json({ csrfToken: token })
}

export function csrfProtection(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  if (origin && !env.corsOrigins.includes(origin)) {
    return next(new AppError(403, 'CSRF_ORIGIN_DENIED', 'Request origin is not allowed.'))
  }
  const cookieToken = req.cookies?.lp_csrf
  const headerToken = req.get('x-csrf-token')
  if (!cookieToken || !headerToken || cookieToken !== headerToken || !verifyValue(headerToken, 'csrf')) {
    return next(new AppError(403, 'CSRF_TOKEN_INVALID', 'A valid CSRF token is required. Refresh the application and retry.'))
  }
  return next()
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' } },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'AUTH_RATE_LIMITED', message: 'Too many authentication attempts. Try again later.' } },
})

export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'REGISTRATION_RATE_LIMITED', message: 'Too many registration attempts. Try again later.' } },
})

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'PASSWORD_RESET_RATE_LIMITED', message: 'Too many password reset attempts. Try again later.' } },
})

export const abuseReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'ABUSE_REPORT_RATE_LIMITED', message: 'Too many reports from this address. Try again later.' } },
})

export const redirectLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many redirects. Try again shortly.' } },
})

export const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'IMPORT_RATE_LIMITED', message: 'Import limit reached. Try again later.' } },
})
