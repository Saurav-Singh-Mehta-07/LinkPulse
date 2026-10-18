import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, makeVisitorKey, signValue, verifyPassword, verifyValue } from '../utils/crypto.js'
import { parseDestination } from '../utils/url.js'
import { classifyUserAgent } from '../utils/ua.js'
import { createLinkSchema, registerSchema } from '../validators/schemas.js'
import { parseDateRange } from '../utils/pagination.js'
import { assertRuntimeConfig } from '../config/env.js'

assertRuntimeConfig()

test('passwords are scrypt-hashed and verified without storing plaintext', async () => {
  const encoded = await hashPassword('correct-horse-battery-staple')
  assert.match(encoded, /^scrypt\$/)
  assert.notEqual(encoded, 'correct-horse-battery-staple')
  assert.equal(await verifyPassword('correct-horse-battery-staple', encoded), true)
  assert.equal(await verifyPassword('incorrect-password', encoded), false)
})

test('signed values validate purpose and reject tampering', () => {
  const token = signValue('nonce-value', 'csrf')
  assert.equal(verifyValue(token, 'csrf'), 'nonce-value')
  assert.equal(verifyValue(token, 'link-unlock'), null)
  assert.equal(verifyValue(`${token}x`, 'csrf'), null)
})

test('visitor keys are pseudonymous and isolated to a calendar month', () => {
  const key = makeVisitorKey('192.0.2.1', 'Example Browser', new Date('2025-06-01T00:00:00Z'))
  assert.equal(key, makeVisitorKey('192.0.2.1', 'Example Browser', new Date('2025-06-29T00:00:00Z')))
  assert.notEqual(key, makeVisitorKey('192.0.2.2', 'Example Browser', new Date('2025-06-01T00:00:00Z')))
  assert.notEqual(key, makeVisitorKey('192.0.2.1', 'Example Browser', new Date('2025-07-01T00:00:00Z')))
  assert.equal(key.includes('192.0.2.1'), false)
})

test('destination validation permits only safe absolute http(s) URLs', () => {
  assert.equal(parseDestination('https://example.com/path').startsWith('https://example.com/path'), true)
  for (const destination of ['javascript:alert(1)', 'data:text/html,hello', 'https://user:pass@example.com', '//example.com']) {
    assert.throws(() => parseDestination(destination), { code: 'INVALID_DESTINATION' })
  }
})

test('request schemas reject public role injection and unsafe destinations', () => {
  assert.equal(registerSchema.safeParse({ name: 'A User', email: 'a@example.test', password: 'correct-horse-battery-staple', role: 'admin' }).success, false)
  assert.equal(createLinkSchema.safeParse({ destination: 'javascript:alert(1)' }).success, false)
  assert.equal(createLinkSchema.safeParse({ destination: 'https://example.test', alias: 'go1' }).success, true)
})

test('user-agent classifier excludes known preview and bot traffic', () => {
  assert.equal(classifyUserAgent('Mozilla/5.0 (iPhone) Mobile Safari/605.1').device, 'mobile')
  assert.equal(classifyUserAgent('Slackbot-LinkExpanding 1.0').bot, true)
  assert.equal(classifyUserAgent('Mozilla/5.0 Chrome/123.0').browser, 'Chrome')
})

test('analytics date ranges reject invalid and overlong spans', () => {
  assert.equal(parseDateRange({ from: 'not-a-date', to: '2025-01-01' }).error, 'Date range is invalid.')
  assert.match(parseDateRange({ from: '2023-01-01', to: '2025-01-01' }).error, /may not exceed/)
})
