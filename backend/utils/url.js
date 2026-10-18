import { AppError } from './errors.js'

const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])

export function parseDestination(value) {
  if (typeof value !== 'string' || value.length > 2048) {
    throw new AppError(400, 'INVALID_DESTINATION', 'Destination URL must be a string no longer than 2048 characters.')
  }
  let parsed
  try { parsed = new URL(value.trim()) } catch { throw new AppError(400, 'INVALID_DESTINATION', 'Enter a valid absolute destination URL.') }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new AppError(400, 'INVALID_DESTINATION', 'Only http and https destinations without embedded credentials are allowed.')
  }
  if (parsed.hostname.endsWith('.') || parsed.hostname.length > 253) {
    throw new AppError(400, 'INVALID_DESTINATION', 'Destination hostname is invalid.')
  }
  if (process.env.NODE_ENV === 'production' && localHosts.has(parsed.hostname.toLowerCase())) {
    throw new AppError(400, 'INVALID_DESTINATION', 'Local destinations are not allowed.')
  }
  return parsed.toString()
}

export function normalizeDomain(value) {
  if (typeof value !== 'string') throw new AppError(400, 'INVALID_DOMAIN', 'Enter a valid domain name.')
  const candidate = value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/\.$/, '')
  if (candidate.length > 253 || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(candidate)) {
    throw new AppError(400, 'INVALID_DOMAIN', 'Enter a valid domain name, such as example.com.')
  }
  return candidate
}
