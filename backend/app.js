import { randomUUID } from 'node:crypto'
import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import { logger } from './config/logger.js'
import { databaseStatus, requireDatabase } from './config/database.js'
import { assertRuntimeConfig, env } from './config/env.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { corsMiddleware, csrfProtection, generalLimiter, redirectLimiter, issueCsrf } from './middleware/security.js'
import adminRoutes from './routes/admin.routes.js'
import accountRoutes from './routes/account.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import authRoutes from './routes/auth.routes.js'
import linkRoutes from './routes/link.routes.js'
import publicRoutes from './routes/public.routes.js'
import redirectRoutes from './routes/redirect.routes.js'
import resourceRoutes from './routes/resource.routes.js'

export function createApp() {
  assertRuntimeConfig()
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', env.TRUST_PROXY)
  app.use(helmet())
  app.use(corsMiddleware)
  app.use(pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, path: req.url?.split('?')[0] || '' }
      },
      res(res) {
        return { statusCode: res.statusCode }
      },
    },
    genReqId(_req, res) {
      const id = randomUUID()
      res.setHeader('X-Request-Id', id)
      return id
    },
  }))
  app.use(cookieParser())
  app.use(express.json({ limit: '100kb', strict: true }))

  app.get('/health', (_req, res) => {
    const database = databaseStatus()
    res.json({ status: database.connected ? 'ok' : 'degraded', service: 'linkpulse-api', database })
  })
  app.get('/health/ready', (_req, res) => {
    const database = databaseStatus()
    res.status(database.connected ? 200 : 503).json({ ready: database.connected, database })
  })

  app.use('/api', generalLimiter)
  app.get('/api/auth/csrf', issueCsrf)
  app.use('/api', csrfProtection)
  app.use('/api', requireDatabase)
  app.use('/api/auth', authRoutes)
  app.use('/api/account', accountRoutes)
  app.use('/api/links', linkRoutes)
  app.use('/api/analytics', analyticsRoutes)
  app.use('/api', publicRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api', resourceRoutes)
  app.use('/api', notFound)

  app.use('/', redirectLimiter, requireDatabase, redirectRoutes)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

export const app = createApp()
