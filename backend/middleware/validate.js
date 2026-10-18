import { AppError } from '../utils/errors.js'

export function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    req.validated ||= {}
    for (const [key, schema] of Object.entries({ body, query, params })) {
      if (!schema) continue
      const parsed = schema.safeParse(req[key])
      if (!parsed.success) {
        return next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.', parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))))
      }
      req.validated[key] = parsed.data
      if (key !== 'query') req[key] = parsed.data
    }
    return next()
  }
}
