import { app } from './app.js'
import { assertRuntimeConfig, env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'
import { logger } from './config/logger.js'

assertRuntimeConfig()

let server
let shuttingDown = false

async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, 'Shutting down LinkPulse API.')
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
      server.closeIdleConnections?.()
    })
  }
  await disconnectDatabase()
}

async function start() {
  if (env.MONGODB_URI) {
    try {
      await connectDatabase()
    } catch {
      logger.warn('API will start in degraded mode; database-backed routes will respond with 503.')
    }
  } else {
    await connectDatabase()
  }
  server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, `LinkPulse API listening at http://localhost:${env.PORT}`))
}

process.once('SIGINT', () => shutdown('SIGINT').then(() => process.exit(0)).catch((error) => {
  logger.error({ err: error }, 'Shutdown failed.')
  process.exit(1)
}))
process.once('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(0)).catch((error) => {
  logger.error({ err: error }, 'Shutdown failed.')
  process.exit(1)
}))

start().catch((error) => {
  logger.fatal({ err: error }, 'API startup failed.')
  process.exitCode = 1
})
