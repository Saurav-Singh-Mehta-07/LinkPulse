import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { app } from '../app.js'
import { databaseStatus } from '../config/database.js'

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

test('CSRF bootstrap is available without MongoDB, but state-changing requests require its token', async () => {
  const bootstrap = await request(app).get('/api/auth/csrf')
  assert.equal(bootstrap.status, 200)
  assert.equal(typeof bootstrap.body.csrfToken, 'string')
  assert.ok(bootstrap.headers['set-cookie'].some((cookie) => cookie.startsWith('lp_csrf=')))
  const response = await request(app).post('/api/auth/register').send({
    name: 'Test', email: 'test@example.test', password: 'correct-horse-battery-staple',
  })
  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'CSRF_TOKEN_INVALID')
  if (!databaseStatus().connected) {
    const cookie = bootstrap.headers['set-cookie'].find((value) => value.startsWith('lp_csrf=')).split(';')[0]
    const validCsrf = await request(app).post('/api/auth/register')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', bootstrap.body.csrfToken)
      .send({ name: 'Test', email: 'test@example.test', password: 'correct-horse-battery-staple' })
    assert.equal(validCsrf.status, 503)
    assert.equal(validCsrf.body.error.code, 'DATABASE_UNAVAILABLE')
  }
})

test('configured frontend origin is enforced by CORS', async () => {
  const response = await request(app).get('/health').set('Origin', 'https://attacker.invalid')
  assert.equal(response.status, 403)
  assert.equal(response.body.error.code, 'CORS_ORIGIN_DENIED')
})
