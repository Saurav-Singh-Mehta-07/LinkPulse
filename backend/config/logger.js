import pino from 'pino'
import { env } from './env.js'

export const logger = pino({
  level: process.env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'req.headers.x-csrf-token', 'req.url', 'password', 'token', 'resetToken', 'SESSION_SECRET'],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
})
