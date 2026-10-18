import mongoose from 'mongoose'
import { env } from './env.js'
import { logger } from './logger.js'

let connectionPromise = null
let indexesReady = false

export function databaseStatus() {
  const connected = mongoose.connection.readyState === 1 && indexesReady
  const state = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
  return {
    configured: Boolean(env.MONGODB_URI),
    connected,
    state: state === 'connected' && !indexesReady ? 'indexing' : state,
  }
}

export async function connectDatabase(uri = env.MONGODB_URI) {
  if (!uri) {
    logger.warn('MONGODB_URI is not configured; database-backed API routes will return 503.')
    return false
  }
  if (mongoose.connection.readyState === 1 && indexesReady) return true
  if (!connectionPromise) {
    indexesReady = false
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: env.NODE_ENV !== 'production',
    }).then(() => {
      return Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).createIndexes()))
    }).then(() => {
      indexesReady = true
      logger.info('MongoDB connected.')
      return true
    }).catch((error) => {
      indexesReady = false
      logger.error({ err: error }, 'MongoDB connection failed.')
      if (mongoose.connection.readyState !== 0) return mongoose.disconnect().then(() => { throw error })
      throw error
    }).finally(() => { connectionPromise = null })
  }
  return connectionPromise
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
  indexesReady = false
}

export async function requireDatabase(_req, res, next) {
  if (!databaseStatus().connected) {
    return res.status(503).json({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'The database is not connected. Configure MONGODB_URI and restart the API.' },
    })
  }
  return next()
}
