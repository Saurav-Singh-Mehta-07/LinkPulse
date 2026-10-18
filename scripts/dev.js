import net from 'node:net'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const root = fileURLToPath(new URL('../', import.meta.url))
dotenv.config({ path: [path.join(root, 'backend/.env'), path.join(root, '.env')] })

function canListen(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', (error) => error.code === 'EADDRINUSE' ? resolve(false) : reject(error))
    server.listen(host ? { port, host } : { port }, () => server.close((error) => error ? reject(error) : resolve(true)))
  })
}

async function choosePort(preferred, label, host) {
  for (let port = preferred; port < preferred + 100; port += 1) {
    if (await canListen(port, host)) return port
  }
  throw new Error(`No available ${label} port in ${preferred}-${preferred + 99}.`)
}

function configuredPort(value, fallback, label) {
  const port = Number(value || fallback)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${label} must be a valid TCP port.`)
  return port
}

let stopping = false
const children = []

function stopAll(signal, exitCode = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal)
  }
  const forceExit = setTimeout(() => process.exit(exitCode), 5000)
  forceExit.unref()
}

async function start() {
  const preferredFrontendPort = configuredPort(process.env.VITE_PORT, 5173, 'VITE_PORT')
  const preferredApiPort = configuredPort(process.env.PORT, 4000, 'PORT')
  const [frontendPort, apiPort] = await Promise.all([
    choosePort(preferredFrontendPort, 'frontend', '0.0.0.0'),
    choosePort(preferredApiPort, 'API'),
  ])
  const frontendOrigin = `http://localhost:${frontendPort}`
  const apiOrigin = `http://localhost:${apiPort}`
  const allowedOrigins = new Set([
    ...((process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)),
    frontendOrigin,
  ])
  const childEnv = {
    ...process.env,
    PORT: String(apiPort),
    FRONTEND_URL: frontendOrigin,
    CORS_ORIGINS: [...allowedOrigins].join(','),
    PUBLIC_SHORT_DOMAIN: process.env.PUBLIC_SHORT_DOMAIN || apiOrigin,
    VITE_API_URL: apiOrigin,
    VITE_PUBLIC_SHORT_URL: process.env.PUBLIC_SHORT_DOMAIN || apiOrigin,
  }

  const backend = spawn(process.execPath, ['--watch', path.join(root, 'backend/server.js')], {
    cwd: root, env: childEnv, stdio: 'inherit',
  })
  const frontend = spawn(process.execPath, [
    path.join(root, 'node_modules/vite/bin/vite.js'),
    path.join(root, 'frontend'),
    '--config', path.join(root, 'frontend/vite.config.js'),
    '--host', '0.0.0.0', '--port', String(frontendPort), '--strictPort',
  ], { cwd: root, env: childEnv, stdio: 'inherit' })
  children.push(backend, frontend)

  for (const child of children) {
    child.once('error', (error) => {
      console.error(`Could not start LinkPulse development process: ${error.message}`)
      stopAll('SIGTERM', 1)
    })
    child.once('exit', (code) => {
      if (!stopping) stopAll('SIGTERM', code || 1)
    })
  }
  console.log(`LinkPulse frontend: ${frontendOrigin}`)
  console.log(`LinkPulse API: ${apiOrigin}`)
  console.log('Press Ctrl+C to stop both servers.')
}

process.once('SIGINT', () => stopAll('SIGINT'))
process.once('SIGTERM', () => stopAll('SIGTERM'))
start().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
