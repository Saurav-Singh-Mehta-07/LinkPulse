import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { AppError } from '../utils/errors.js'

let transporter

function getTransporter() {
  if (!env.SMTP_HOST) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.smtpSecure,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    })
  }
  return transporter
}

export async function sendPasswordReset(email, token) {
  const resetUrl = new URL('/reset-password', env.FRONTEND_URL)
  resetUrl.searchParams.set('token', token)
  const mailer = getTransporter()
  if (!mailer) {
    if (env.NODE_ENV === 'production') {
      throw new AppError(503, 'EMAIL_NOT_CONFIGURED', 'Password reset email delivery is not configured.')
    }
    logger.info({ email, resetUrl: resetUrl.toString() }, 'Development password reset link; configure SMTP for delivery.')
    return
  }
  await mailer.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Reset your LinkPulse password',
    text: `Use this one-time link to reset your password. It expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes.\n\n${resetUrl.toString()}`,
  })
}
