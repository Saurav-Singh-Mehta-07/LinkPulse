import { env, assertRuntimeConfig } from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { logger } from '../config/logger.js'
import { User } from '../models/User.js'
import { hashPassword } from '../utils/crypto.js'

async function seed() {
  assertRuntimeConfig()
  if (env.NODE_ENV !== 'development') throw new Error('The demo seed is restricted to NODE_ENV=development.')
  if (!env.MONGODB_URI) throw new Error('Set MONGODB_URI in backend/.env before running the demo seed.')
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password || password.length < 12) {
    throw new Error('Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 12 characters in backend/.env.')
  }
  await connectDatabase()
  const existing = await User.findOne({ email }).select('role')
  if (existing) {
    if (existing.role !== 'admin') throw new Error('The configured seed email already belongs to a non-admin user; no role changes were made.')
    logger.info({ email }, 'Seed admin already exists; no changes made.')
    return
  }
  await User.create({
    name: 'LinkPulse Admin',
    email,
    passwordHash: await hashPassword(password),
    role: 'admin',
  })
  logger.info({ email }, 'Development admin account created.')
}

seed().catch((error) => {
  logger.error({ err: error }, 'Development seed failed.')
  process.exitCode = 1
}).finally(async () => {
  await disconnectDatabase()
})
