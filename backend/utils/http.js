import { env } from '../config/env.js'

export function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    ...(maxAge ? { maxAge } : {}),
  }
}

export function clientCookieOptions(maxAge) {
  const options = cookieOptions(maxAge)
  delete options.httpOnly
  return options
}
