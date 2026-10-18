import {
  createHash, createHmac, randomBytes, timingSafeEqual, scrypt as scryptCallback,
} from 'node:crypto'
import { promisify } from 'node:util'
import { env } from '../config/env.js'

const scrypt = promisify(scryptCallback)

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function signValue(value, purpose) {
  const signature = createHmac('sha256', env.SESSION_SECRET).update(`${purpose}:${value}`).digest('base64url')
  return `${value}.${signature}`
}

export function verifyValue(signed, purpose) {
  if (typeof signed !== 'string') return null
  const split = signed.lastIndexOf('.')
  if (split <= 0) return null
  const value = signed.slice(0, split)
  const expected = signValue(value, purpose).slice(split + 1)
  const supplied = signed.slice(split + 1)
  const a = Buffer.from(expected)
  const b = Buffer.from(supplied)
  return a.length === b.length && timingSafeEqual(a, b) ? value : null
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)
  return `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`
}

export async function verifyPassword(password, encoded) {
  const [algorithm, salt, digest] = String(encoded || '').split('$')
  if (algorithm !== 'scrypt' || !salt || !digest) return false
  const actual = Buffer.from(await scrypt(password, salt, 64))
  const expected = Buffer.from(digest, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function makeVisitorKey(ip, userAgent, date = new Date()) {
  const monthBucket = date.toISOString().slice(0, 7)
  const normalizedIp = String(ip || '').replace(/^::ffff:/, '')
  const userAgentHash = sha256(String(userAgent || '').slice(0, 500))
  return createHmac('sha256', env.SESSION_SECRET).update(`${monthBucket}:${normalizedIp}:${userAgentHash}`).digest('hex')
}
