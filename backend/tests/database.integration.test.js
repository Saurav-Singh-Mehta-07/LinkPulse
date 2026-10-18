import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import mongoose from 'mongoose'
import { app } from '../app.js'
import { connectDatabase, databaseStatus, disconnectDatabase } from '../config/database.js'
import { env } from '../config/env.js'
import { AbuseReport } from '../models/AbuseReport.js'
import { AuthSession } from '../models/AuthSession.js'
import { AuditLog } from '../models/AuditLog.js'
import { BioPage } from '../models/BioPage.js'
import { BlockedDomain } from '../models/BlockedDomain.js'
import { Campaign } from '../models/Campaign.js'
import { ClickEvent } from '../models/ClickEvent.js'
import { Folder } from '../models/Folder.js'
import { Link } from '../models/Link.js'
import { Tag } from '../models/Tag.js'
import { User } from '../models/User.js'
import { hashPassword } from '../utils/crypto.js'

const itWithDatabase = env.MONGODB_URI ? test : test.skip
const csrfTokens = new WeakMap()

async function csrf(agent) {
  const existing = csrfTokens.get(agent)
  if (existing) return existing
  const response = await agent.get('/api/auth/csrf').expect(200)
  csrfTokens.set(agent, response.body.csrfToken)
  return response.body.csrfToken
}

function mutate(agent, method, url, body) {
  const token = csrfTokens.get(agent)
  if (!token) throw new Error('Get a CSRF token before making a state-changing integration-test request.')
  return agent[method](url).set('X-CSRF-Token', token).send(body)
}

function register(agent, name, email, password) {
  return mutate(agent, 'post', '/api/auth/register', { name, email, password })
}

itWithDatabase('MongoDB API lifecycle: auth, ownership, link rules, redirects, analytics, imports, and admin controls', async () => {
  await connectDatabase()
  assert.equal(databaseStatus().connected, true, 'MongoDB indexes must finish before integration checks')

  await request(app).get('/api/links').expect(401)

  const suffix = randomUUID()
  const users = []
  const links = []
  const blockedDomainIds = []
  const emails = {
    owner: `lp-owner-${suffix}@example.test`,
    other: `lp-other-${suffix}@example.test`,
    admin: `lp-admin-${suffix}@example.test`,
  }
  const password = 'lifecycle-password-2026'

  try {
    const owner = request.agent(app)
    await csrf(owner)
    const registration = await register(owner, 'Lifecycle Owner', emails.owner, password).expect(201)
    assert.equal(registration.body.user.role, 'user')
    assert.equal(registration.body.user.email, emails.owner)
    assert.ok(registration.headers['set-cookie'].some((cookie) => /^lp_session=.*httponly/i.test(cookie)))
    const ownerId = new mongoose.Types.ObjectId(registration.body.user.id)
    users.push(ownerId)
    assert.equal((await owner.get('/api/auth/me').expect(200)).body.user.id, ownerId.toString())

    const duplicateRegistration = await register(owner, 'Lifecycle Owner', emails.owner, password)
    assert.equal(duplicateRegistration.status, 409)
    assert.equal(duplicateRegistration.body.error.code, 'DUPLICATE_RESOURCE')

    const invalidLogin = request.agent(app)
    await csrf(invalidLogin)
    const invalidCredentials = await mutate(invalidLogin, 'post', '/api/auth/login', {
      email: emails.owner, password: 'incorrect-password',
    })
    assert.equal(invalidCredentials.status, 401)
    assert.equal(invalidCredentials.body.error.code, 'INVALID_CREDENTIALS')

    const roleInjection = request.agent(app)
    await csrf(roleInjection)
    await mutate(roleInjection, 'post', '/api/auth/register', {
      name: 'Public Admin', email: `lp-role-${suffix}@example.test`, password, role: 'admin',
    }).expect(400)

    const other = request.agent(app)
    await csrf(other)
    const otherRegistration = await register(other, 'Other Owner', emails.other, password).expect(201)
    const otherId = new mongoose.Types.ObjectId(otherRegistration.body.user.id)
    users.push(otherId)
    const loginAgent = request.agent(app)
    await csrf(loginAgent)
    const loginResponse = await mutate(loginAgent, 'post', '/api/auth/login', { email: emails.other, password })
    assert.equal(loginResponse.status, 200, JSON.stringify(loginResponse.body))
    await loginAgent.get('/api/auth/me').expect(200)
    await mutate(loginAgent, 'post', '/api/auth/logout').expect(204)
    await loginAgent.get('/api/auth/me').expect(401)

    const campaignResponse = await mutate(owner, 'post', '/api/campaigns', { name: `Campaign ${suffix}` }).expect(201)
    const campaign = campaignResponse.body.campaign
    const tag = (await mutate(owner, 'post', '/api/tags', { name: `Tag ${suffix}` }).expect(201)).body.tag
    const folder = (await mutate(owner, 'post', '/api/folders', { name: `Folder ${suffix}` }).expect(201)).body.folder

    const created = await mutate(owner, 'post', '/api/links', {
      destination: 'https://example.test/original',
      alias: `life-${suffix.slice(0, 12)}`,
      title: 'Lifecycle link',
      campaignId: campaign._id,
      folderId: folder._id,
      tagIds: [tag._id],
    }).expect(201)
    const link = created.body.link
    links.push(link._id)
    assert.equal(link.shortUrl, new URL(`/${link.code}`, env.PUBLIC_SHORT_DOMAIN).toString())
    assert.equal((await Link.findById(link._id).lean()).destination, 'https://example.test/original')
    assert.ok((await owner.get('/api/links').expect(200)).body.items.some(({ _id }) => _id === link._id))

    await other.get(`/api/links/${link._id}`).expect(404)
    await mutate(other, 'patch', `/api/links/${link._id}`, { title: 'Unauthorized edit' }).expect(404)
    await other.get(`/api/links/${link._id}/analytics`).expect(404)
    await other.get(`/api/analytics/campaigns/${campaign._id}`).expect(404)
    await mutate(other, 'patch', `/api/campaigns/${campaign._id}`, { description: 'Cross-workspace edit' }).expect(404)
    await mutate(other, 'patch', `/api/tags/${tag._id}`, { name: 'Cross-workspace tag' }).expect(404)
    await mutate(other, 'patch', `/api/folders/${folder._id}`, { name: 'Cross-workspace folder' }).expect(404)

    const duplicateAlias = await mutate(owner, 'post', '/api/links', {
      destination: 'https://example.test/duplicate', alias: link.code,
    })
    assert.equal(duplicateAlias.status, 409)
    await mutate(owner, 'post', '/api/links', { destination: 'javascript:alert(1)' }).expect(400)
    await mutate(owner, 'post', '/api/links', { destination: 'https://user:secret@example.test/' }).expect(400)
    assert.equal((await owner.get(`/api/links/alias/${link.code}/availability`).expect(200)).body.available, false)
    assert.equal((await owner.get(`/api/links/${link._id}/qr`).expect(200)).body.url, link.shortUrl)

    const patched = await mutate(owner, 'patch', `/api/links/${link._id}`, {
      title: 'Updated lifecycle link',
      destination: 'https://example.test/updated',
    }).expect(200)
    assert.equal(patched.body.link.title, 'Updated lifecycle link')
    const click = await request(app).get(`/${link.code}`)
      .set('User-Agent', 'Mozilla/5.0 Chrome/123.0')
      .set('Referer', 'https://referrer.example.test/path')
      .expect(302)
    assert.equal(click.headers.location, 'https://example.test/updated')
    assert.equal((await Link.findById(link._id).lean()).clickCount, 1)
    const clickEvent = await ClickEvent.findOne({ linkId: link._id }).lean()
    assert.equal(clickEvent.referrerHost, 'referrer.example.test')
    assert.equal(clickEvent.browser, 'Chrome')
    assert.equal(clickEvent.isBot, false)

    await request(app).get(`/${link.code}`).set('User-Agent', 'Slackbot-LinkExpanding/1.0').expect(302)
    assert.equal((await Link.findById(link._id).lean()).clickCount, 1, 'known preview bots must not consume click counts')
    assert.equal(await ClickEvent.countDocuments({ linkId: link._id }), 1, 'known preview bots must not create analytics events')

    const campaignLinkResponse = await mutate(owner, 'post', '/api/links', {
      destination: 'https://example.test/campaign',
      campaignId: campaign._id,
      alias: `camp-${suffix.slice(0, 12)}`,
    }).expect(201)
    const campaignLink = campaignLinkResponse.body.link
    links.push(campaignLink._id)
    await request(app).get(`/${campaignLink.code}`).set('User-Agent', 'Mozilla/5.0 Chrome/123.0').expect(302)
    const campaignAnalytics = await owner.get(`/api/analytics/campaigns/${campaign._id}`).expect(200)
    assert.equal(campaignAnalytics.body.totalClicks, 2)
    assert.equal(campaignAnalytics.body.campaigns[0].campaignId, campaign._id)

    const dashboard = await owner.get('/api/analytics').expect(200)
    assert.ok(dashboard.body.totalClicks >= 2)
    assert.ok(dashboard.body.clickTrend.length > 0)
    assert.ok(dashboard.body.devices.some(({ device }) => device === 'desktop'))
    assert.ok(dashboard.body.sources.some(({ source }) => source === 'referrer.example.test'))

    const expiringResponse = await mutate(owner, 'post', '/api/links', {
      destination: 'https://example.test/expired',
      alias: `exp-${suffix.slice(0, 12)}`,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }).expect(201)
    links.push(expiringResponse.body.link._id)
    await Link.updateOne({ _id: expiringResponse.body.link._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
    const expiredRedirect = await request(app).get(`/${expiringResponse.body.link.code}`).expect(302)
    assert.ok(expiredRedirect.headers.location.endsWith('/link/expired'))

    const cappedResponse = await mutate(owner, 'post', '/api/links', {
      destination: 'https://example.test/capped',
      alias: `cap-${suffix.slice(0, 12)}`,
      maxClicks: 2,
    }).expect(201)
    links.push(cappedResponse.body.link._id)
    const concurrentRedirects = await Promise.all(Array.from({ length: 8 }, () => request(app)
      .get(`/${cappedResponse.body.link.code}`)
      .set('User-Agent', 'Mozilla/5.0 Chrome/123.0')))
    assert.equal(concurrentRedirects.filter(({ headers }) => headers.location === 'https://example.test/capped').length, 2)
    assert.equal((await Link.findById(cappedResponse.body.link._id).lean()).clickCount, 2)
    assert.equal(await ClickEvent.countDocuments({ linkId: cappedResponse.body.link._id }), 2)

    const protectedResponse = await mutate(owner, 'post', '/api/links', {
      destination: 'https://example.test/protected',
      alias: `pwd-${suffix.slice(0, 12)}`,
      password: 'link-pass-123',
    }).expect(201)
    links.push(protectedResponse.body.link._id)
    const locked = await request(app).get(`/${protectedResponse.body.link.code}`).expect(302)
    assert.ok(locked.headers.location.includes('/s/locked?code='))
    await mutate(owner, 'post', `/api/links/public/${protectedResponse.body.link.code}/unlock`, { password: 'wrong-password' }).expect(401)
    await mutate(owner, 'post', `/api/links/public/${protectedResponse.body.link.code}/unlock`, { password: 'link-pass-123' }).expect(200)
    const unlocked = await owner.get(`/${protectedResponse.body.link.code}`).expect(302)
    assert.equal(unlocked.headers.location, 'https://example.test/protected')
    assert.equal((await Link.findById(protectedResponse.body.link._id).lean()).clickCount, 1)

    const importCsv = Buffer.from([
      'destination,alias,title',
      `https://example.test/imported,imp-${suffix.slice(0, 12)},Imported row`,
      'javascript:alert(1),bad-import,Unsafe row',
    ].join('\r\n'))
    const imported = await owner.post('/api/links/import')
      .set('X-CSRF-Token', await csrf(owner))
      .attach('file', importCsv, 'links.csv')
      .expect(207)
    assert.equal(imported.body.created, 1)
    assert.equal(imported.body.invalid, 1)
    assert.deepEqual(imported.body.results.map(({ status }) => status), ['created', 'invalid'])
    links.push(imported.body.results[0].link._id)

    const disabled = await mutate(owner, 'delete', `/api/links/${link._id}`).expect(200)
    assert.equal(disabled.body.link.status, 'disabled')
    const disabledRedirect = await request(app).get(`/${link.code}`).expect(302)
    assert.ok(disabledRedirect.headers.location.endsWith('/link/disabled'))
    const retained = await owner.get(`/api/links/${link._id}/analytics`).expect(200)
    assert.equal(retained.body.totalClicks, 1, 'historical click records must survive link disablement')
    assert.equal(await ClickEvent.countDocuments({ linkId: link._id }), 1)

    await mutate(owner, 'post', '/api/auth/logout').expect(204)
    await owner.get('/api/auth/me').expect(401)

    const adminPassword = 'integration-admin-password-2026'
    const admin = await User.create({
      name: 'Integration Admin',
      email: emails.admin,
      passwordHash: await hashPassword(adminPassword),
      role: 'admin',
    })
    users.push(admin._id)
    await other.get('/api/admin/analytics').expect(403)

    const adminAgent = request.agent(app)
    await csrf(adminAgent)
    await mutate(adminAgent, 'post', '/api/auth/login', { email: emails.admin, password: adminPassword }).expect(200)
    await adminAgent.get('/api/admin/analytics').expect(200)
    await adminAgent.get('/api/admin/links').expect(200)
    await adminAgent.get('/api/admin/users').expect(200)
    await mutate(adminAgent, 'patch', `/api/admin/users/${admin._id}/status`, { status: 'suspended' }).expect(400)
    const abuse = await mutate(other, 'post', '/api/reports', {
      code: campaignLink.code,
      email: emails.other,
      reason: 'other',
      details: 'Integration lifecycle report',
    }).expect(201)
    assert.equal(abuse.body.report.status, 'open')
    const abuseReport = abuse.body.report
    const blockedDomain = `blocked-${suffix.slice(0, 12)}.example.test`
    const block = await mutate(adminAgent, 'post', '/api/admin/blocked-domains', {
      domain: blockedDomain,
      reason: 'Integration lifecycle test',
    }).expect(201)
    blockedDomainIds.push(block.body.domain._id)
    await mutate(other, 'post', '/api/links', { destination: `https://${blockedDomain}/blocked` }).expect(422)
    await mutate(adminAgent, 'delete', `/api/admin/blocked-domains/${block.body.domain._id}`).expect(204)
    const abuseRows = await adminAgent.get('/api/admin/abuse-reports').expect(200)
    assert.ok(abuseRows.body.items.some(({ _id }) => _id === abuseReport.id))
    await mutate(adminAgent, 'patch', `/api/admin/abuse-reports/${abuseReport.id}`, {
      status: 'resolved',
      resolution: 'Integration review complete',
    }).expect(200)
    await mutate(adminAgent, 'patch', `/api/admin/links/${campaignLink._id}/takedown`, { reason: 'Integration test takedown' }).expect(200)
    const takenDownRedirect = await request(app).get(`/${campaignLink.code}`).expect(302)
    assert.ok(takenDownRedirect.headers.location.endsWith('/link/disabled'))
    await mutate(adminAgent, 'patch', `/api/admin/users/${otherId}/status`, { status: 'suspended' }).expect(200)
    await other.get('/api/auth/me').expect(401)

    const persisted = await Link.findById(campaignLink._id).lean()
    assert.equal(persisted.status, 'taken_down')
    assert.equal(await ClickEvent.countDocuments({ linkId: campaignLink._id }), 1)
  } finally {
    if (users.length) {
      const userFilter = { $in: users }
      const ownedLinks = await Link.find({ userId: userFilter }).select('_id').lean()
      const linkIds = [...links, ...ownedLinks.map(({ _id }) => _id)]
      const userMatch = { $in: users }
      await Promise.all([
        AuthSession.deleteMany({ userId: userMatch }),
        ClickEvent.deleteMany({ ownerId: userMatch }),
        ClickEvent.deleteMany({ linkId: { $in: linkIds } }),
        Link.deleteMany({ userId: userMatch }),
        Campaign.deleteMany({ userId: userMatch }),
        Tag.deleteMany({ userId: userMatch }),
        Folder.deleteMany({ userId: userMatch }),
        BioPage.deleteMany({ userId: userMatch }),
        AuditLog.deleteMany({ $or: [{ actorId: userMatch }, { targetUserId: userMatch }] }),
        AbuseReport.deleteMany({ reporterEmail: { $in: Object.values(emails) } }),
        BlockedDomain.deleteMany({ _id: { $in: blockedDomainIds } }),
        User.deleteMany({ _id: userMatch }),
      ])
    }
    await disconnectDatabase()
  }
}, { skip: !env.MONGODB_URI, timeout: 120_000 })
