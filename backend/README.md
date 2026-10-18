# LinkPulse backend

The Express API owns authentication, link management, redirects, QR metadata, click tracking, analytics, and administrator endpoints. It persists data in MongoDB and is deployable independently from the Vite frontend.

## Local setup

From this directory:

```powershell
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Set `MONGODB_URI` to a MongoDB Atlas replica-set URI and set a unique `SESSION_SECRET` of at least 32 characters. Configure Atlas network access for the development host. The API listens on `http://localhost:4000` by default; `/health` reports liveness and `/health/ready` requires a connected database.

## Environment

See [.env.example](./.env.example) for all supported settings. `MONGODB_URI` is required for persistent API features. Production requires `NODE_ENV=production`, a strong `SESSION_SECRET`, an exact `FRONTEND_URL` and `CORS_ORIGINS`, and HTTPS. Keep `COOKIE_DOMAIN` empty for the Render `onrender.com` service hostnames; cookies are host-only. Do not commit `.env`.

## CSRF and authentication

Authentication uses an HTTP-only `lp_session` cookie backed by revocable server-side sessions. The API issues a signed double-submit CSRF token at `GET /api/auth/csrf`, setting the `lp_csrf` cookie and returning the same token as JSON. The frontend includes it as `X-CSRF-Token` on every state-changing API request, including registration, login, and logout. CSRF validation applies globally to `/api` mutations. Production cookies use `Secure; SameSite=None` so credentialed requests from the separately hosted frontend can include them; development uses `SameSite=Strict`. CORS only allows explicitly listed origins.

## Commands

```powershell
npm start
npm test
npm run seed:demo
npm run admin:bootstrap
```

`seed:demo` is for development only. `admin:bootstrap` is a one-time operator command and requires `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`.

## Render

Create a Render Web Service with root directory `backend`, build command `npm install`, start command `npm start`, and health-check path `/health/ready`. Set the backend variables documented in [.env.example](./.env.example). Allow the deployed frontend origin `https://linkpulse-1-m89v.onrender.com` in both `FRONTEND_URL` and `CORS_ORIGINS`. Configure `MONGODB_URI` and `SESSION_SECRET` as Render secrets. Render supplies `PORT`; set `TRUST_PROXY=1`.
