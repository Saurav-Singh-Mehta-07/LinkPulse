import mongoose from 'mongoose'
import { env, assertRuntimeConfig } from '../config/env.js'
import { connectDatabase, disconnectDatabase, databaseStatus } from '../config/database.js'
import { logger } from '../config/logger.js'
import { PlatformSetting } from '../models/PlatformSetting.js'
import { User } from '../models/User.js'
import { hashPassword } from '../utils/crypto.js'

async function bootstrapAdmin() {
  assertRuntimeConfig()
  if (env.NODE_ENV !== 'production') {
    throw new Error('The production admin bootstrap is available only when NODE_ENV=production.')
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set a valid BOOTSTRAP_ADMIN_EMAIL for this one-time command.')
  }
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error('Set a BOOTSTRAP_ADMIN_PASSWORD between 12 and 128 characters for this one-time command.')
  }

  await connectDatabase()
  if (!databaseStatus().connected) throw new Error('MongoDB is not ready; no administrator was created.')
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      if (await User.exists({ role: 'admin' }).session(session)) {
        throw new Error('An administrator already exists; no account was changed.')
      }
      if (await User.exists({ email }).session(session)) {
        throw new Error('That email already belongs to an account; no role was changed.')
      }

      const [admin] = await User.create([{
        name: 'LinkPulse Administrator',
        email,
        passwordHash: await hashPassword(password),
        role: 'admin',
      }], { session })
      const claim = await PlatformSetting.findOneAndUpdate(
        { key: 'platform', adminBootstrapClaimedAt: null },
        { $set: { adminBootstrapClaimedAt: new Date(), adminBootstrapAdminId: admin._id } },
        { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true, session },
      )
      if (!claim) throw new Error('Production administrator bootstrap has already been claimed.')
    })
  } finally {
    await session.endSession()
  }
  logger.info('Initial production administrator created. Remove the bootstrap credentials from the deployment environment.')
}

bootstrapAdmin()
  .catch((error) => {
    logger.error({ err: error }, 'Production administrator bootstrap failed.')
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectDatabase()
  })
