import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app } from '../app.js'
import { databaseStatus } from '../config/database.js'
import { env, parseEnv } from '../config/env.js'
import { randomToken, signValue } from '../utils/crypto.js'

test('health endpoint reports the real disconnected database state', async () => {
  const response = await request(app).get('/health')
  assert.equal(response.status, 200)
  assert.equal(response.body.service, 'linkpulse-api')
  assert.equal(response.body.database.connected, databaseStatus().connected)
  assert.equal(response.body.database.configured, databaseStatus().configured)
})

test('readiness reports unavailable while MongoDB is disconnected', async () => {
  if (databaseStatus().connected) return
  const response = await request(app).get('/health/ready')
  assert.equal(response.status, 503)
  assert.equal(response.body.ready, false)
})

test('database-backed APIs fail explicitly instead of pretending to work', async () => {
  if (databaseStatus().connected) return
  const response = await request(app).get('/api/links')
  assert.equal(response.status, 503)
  assert.equal(response.body.error.code, 'DATABASE_UNAVAILABLE')
  const publicBio = await request(app).get('/api/bio/public-page')
  assert.equal(publicBio.status, 503)
  const redirect = await request(app).get('/demo-code')
  assert.equal(redirect.status, 503)
  assert.equal(redirect.body.error.code, 'DATABASE_UNAVAILABLE')
})

test('production cookies support cross-origin HTTPS requests while local cookies stay strict', () => {
  const production = parseEnv({ NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(32) })
  const development = parseEnv({ NODE_ENV: 'development' })
  assert.equal(production.cookieSecure, true)
  assert.equal(production.cookieSameSite, 'none')
  assert.equal(development.cookieSecure, false)
  assert.equal(development.cookieSameSite, 'strict')
})

test('CSRF bootstrap and validation cover missing, invalid, expired, and valid tokens', async () => {
  const origin = env.corsOrigins[0]
  const bootstrap = await request(app).get('/api/auth/csrf').set('Origin', origin)
  assert.equal(bootstrap.status, 200)
  assert.equal(typeof bootstrap.body.csrfToken, 'string')
  assert.ok(bootstrap.headers['set-cookie'].some((cookie) => cookie.startsWith('lp_csrf=')))

  const missing = await request(app).post('/api/auth/register').set('Origin', origin)
    .send({ name: 'Test', email: 'test@example.test', password: 'correct-horse-battery-staple' })
  assert.equal(missing.status, 403)
  assert.equal(missing.body.error.code, 'CSRF_TOKEN_MISSING')

  const invalid = await request(app).post('/api/auth/login')
    .set('Origin', origin)
    .set('Cookie', 'lp_csrf=invalid-token')
    .set('X-CSRF-Token', 'invalid-token')
    .send({ email: 'test@example.test', password: 'correct-horse-battery-staple' })
  assert.equal(invalid.status, 403)
  assert.equal(invalid.body.error.code, 'CSRF_TOKEN_INVALID')

  const expiredToken = signValue(`${Date.now() - 24 * 60 * 60 * 1000 - 1}.${randomToken(24)}`, 'csrf')
  const expired = await request(app).post('/api/auth/logout')
    .set('Origin', origin)
    .set('Cookie', `lp_csrf=${expiredToken}`)
    .set('X-CSRF-Token', expiredToken)
  assert.equal(expired.status, 403)
  assert.equal(expired.body.error.code, 'CSRF_TOKEN_EXPIRED')

  if (!databaseStatus().connected) {
    const cookie = bootstrap.headers['set-cookie'].find((value) => value.startsWith('lp_csrf=')).split(';')[0]
    const validRequests = [
      request(app).post('/api/auth/register').send({
        name: 'Test', email: 'test@example.test', password: 'correct-horse-battery-staple',
      }),
      request(app).post('/api/auth/login').send({
        email: 'test@example.test', password: 'correct-horse-battery-staple',
      }),
      request(app).post('/api/auth/logout'),
    ]
    for (const validRequest of validRequests) {
      const response = await validRequest
        .set('Origin', origin)
        .set('Cookie', cookie)
        .set('X-CSRF-Token', bootstrap.body.csrfToken)
      assert.equal(response.status, 503)
      assert.equal(response.body.error.code, 'DATABASE_UNAVAILABLE')
    }
  }
})

test('configured frontend origin is enforced by CORS', async () => {
  const response = await request(app).get('/health').set('Origin', 'https://attacker.invalid')
  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'CORS_ORIGIN_DENIED')
})

test('CORS preflight permits only configured origins and the CSRF header', async () => {
  const origin = env.corsOrigins[0]
  const response = await request(app).options('/api/auth/login')
    .set('Origin', origin)
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'content-type,x-csrf-token')
  assert.equal(response.status, 204)
  assert.equal(response.headers['access-control-allow-origin'], origin)
  assert.equal(response.headers['access-control-allow-credentials'], 'true')
  assert.match(response.headers['access-control-allow-headers'], /x-csrf-token/i)
})
