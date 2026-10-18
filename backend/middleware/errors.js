import mongoose from 'mongoose'
import { logger } from '../config/logger.js'
import { AppError } from '../utils/errors.js'

export function notFound(req, _res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No route matches ${req.method} ${req.path}.`))
}

export function errorHandler(error, req, res, _next) {
  if (res.headersSent) return
  let normalized = error
  if (error instanceof mongoose.Error.ValidationError) {
    normalized = new AppError(400, 'VALIDATION_ERROR', 'The record did not pass validation.', Object.values(error.errors).map((item) => ({ path: item.path, message: item.message })))
  } else if (error instanceof mongoose.Error.CastError) {
    normalized = new AppError(400, 'INVALID_ID', `Invalid value for ${error.path}.`)
  } else if (error instanceof mongoose.Error.StrictModeError) {
    normalized = new AppError(400, 'VALIDATION_ERROR', 'The request includes an unsupported field.')
  } else if (error?.code === 11000) {
    normalized = new AppError(409, 'DUPLICATE_RESOURCE', 'A resource with that value already exists.')
  } else if (error?.type === 'entity.too.large') {
    normalized = new AppError(413, 'BODY_TOO_LARGE', 'The request body exceeds the allowed size.')
  } else if (error?.type === 'entity.parse.failed') {
    normalized = new AppError(400, 'INVALID_JSON', 'The request body is not valid JSON.')
  } else if (error?.name === 'MulterError') {
    normalized = new AppError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, 'UPLOAD_REJECTED', error.code === 'LIMIT_FILE_SIZE' ? 'The upload exceeds the 2 MB file limit.' : 'The uploaded file could not be accepted.')
  } else if (['MongoServerSelectionError', 'MongoNetworkError', 'MongoNotConnectedError'].includes(error?.name)) {
    normalized = new AppError(503, 'DATABASE_UNAVAILABLE', 'The database connection is unavailable. Retry after the connection is restored.')
  }
  const status = Number.isInteger(normalized.status) ? normalized.status : 500
  const code = normalized.code || 'INTERNAL_SERVER_ERROR'
  if (status >= 500) logger.error({ err: error, method: req.method, path: req.path, requestId: req.id }, 'Request failed.')
  else logger.info({ status, code, method: req.method, path: req.path, requestId: req.id }, 'Request rejected.')
  res.status(status).json({
    error: {
      code,
      message: status >= 500 && normalized.status === undefined ? 'An unexpected server error occurred.' : normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
      requestId: req.id,
    },
  })
}
