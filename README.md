# LinkPulse

LinkPulse shortens URLs and gives users a workspace for managing links and understanding click activity. It consists of a React single-page application and an independently deployable Express/MongoDB API.

## Features

- User registration, login, logout, password reset, and account settings.
- Link creation and management with custom aliases, expiry, click limits, passwords, and QR codes.
- Redirects with click tracking and bot filtering.
- Dashboard, link, and campaign analytics.
- Campaigns, tags, folders, and public link-in-bio pages.
- Admin analytics, user and link moderation, abuse reports, blocked domains, settings, and audit logs.
- Responsive React UI, request validation, rate limits, structured errors, and owner-scoped API access.

## Technology

- Frontend: React 18, React Router, Vite, Recharts, Lucide, and `qrcode.react`.
- Backend: Node.js, Express 5, Mongoose, MongoDB Atlas, Zod, Helmet, and Pino.
- Testing: Node's test runner and Supertest; ESLint for frontend linting.
- Node.js: `20.19+` or `22.12+`.

## Repository structure

```text
LinkPulse/
├── frontend/             # UI, Vite config, frontend dependencies and lockfile
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
├── backend/              # API, database models, services, tests and dependencies
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── tests/
│   ├── package.json
│   └── .env.example
├── render.yaml           # Optional Render Blueprint for both services
├── .gitignore
└── README.md
```

Frontend and backend dependencies and lockfiles are kept separate. There is no root application package or root script required to install, run, build, or deploy either service.

## Local development

Use two terminals. Install each application's dependencies independently:

```powershell
cd backend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

In a second terminal:

```powershell
cd frontend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). The frontend example points to the local API at `http://localhost:4000`; the backend's default CORS allowlist permits the local frontend. You can also run `npm start` in `backend/` for production-mode startup without file watching.

Persistent features require MongoDB Atlas or another MongoDB replica set. Set `MONGODB_URI` in `backend/.env`, use an Atlas database user with least privilege, URL-encode reserved characters in its password, and configure Atlas Network Access for the host. Without a database, `/health` remains available and database-backed API requests explicitly return `503`. Transaction-backed redirect tracking requires a replica set.

## Environment variables and secrets

`backend/.env.example` documents the server settings; `frontend/.env.example` documents browser-public Vite settings. Copy the appropriate example to `.env` within that application and replace placeholders locally. `.env` files are ignored by Git. Never place secrets in `frontend/.env`, any `VITE_*` variable, or a checked-in example.

| Variable | Application | Purpose |
|---|---|---|
| `VITE_API_URL` | Frontend | API origin embedded into the static build; local example is `http://localhost:4000`. |
| `VITE_PUBLIC_SHORT_URL` | Frontend | Origin used when displaying/constructing short URLs. |
| `NODE_ENV` | Backend | Set to `production` on Render; controls secure cookie behavior. |
| `PORT` | Backend | HTTP port; Render supplies this automatically. |
| `MONGODB_URI` | Backend | MongoDB Atlas/replica-set connection string; required for persistent features. |
| `FRONTEND_URL` | Backend | Exact frontend origin and destination for link-state pages. |
| `CORS_ORIGINS` | Backend | Comma-separated list of exact allowed browser origins; no wildcard. |
| `SESSION_SECRET` | Backend | Random HMAC/session secret, at least 32 characters in production. |
| `COOKIE_DOMAIN` | Backend | Optional shared cookie domain. Keep empty for the separate Render `onrender.com` hostnames. |
| `TRUST_PROXY` | Backend | Trusted proxy hop count; set to `1` on Render. |
| `SESSION_TTL_DAYS` | Backend | Session duration, 1–90 days; default 14. |
| `PASSWORD_RESET_TTL_MINUTES` | Backend | Password-reset token lifetime; default 30. |
| `PUBLIC_SHORT_DOMAIN` | Backend | Public short-link origin; use the backend URL when it handles redirects. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Backend | Optional password-reset email delivery. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Backend | Development-only demo seed credentials. |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Backend | One-time operator settings for production admin bootstrap. |

The backend loads `backend/.env` first and the root `.env` as a local fallback. Process/Render environment variables take precedence. Do not commit either file.

## CSRF and authentication flow

The existing mechanism is a signed double-submit token, not a synchronizer-token session:

1. Before a state-changing request, the shared frontend API client calls `GET /api/auth/csrf` with `credentials: "include"`.
2. The API issues a signed, 24-hour token, sets it in the `lp_csrf` cookie, and returns the same token in JSON.
3. The frontend retains the token in memory and sends it in `X-CSRF-Token`. It coalesces concurrent initializations and performs at most one token refresh/retry after a CSRF rejection. The middleware runs before routes, so a rejected mutation has not reached its handler.
4. API mutations require the cookie/header pair, matching signatures, a current token, and an allowed request origin. This policy covers login, registration, logout, password actions, links, and admin mutations.
5. Authentication uses a separate HTTP-only `lp_session` cookie backed by server-side session records. The frontend never stores session credentials in localStorage.

The login/signup CSRF failure was caused by the backend setting both cookies to `SameSite=Strict`, even in production, although the frontend and backend run on distinct Render hostnames. Browsers can omit Strict cookies on those cross-site credentialed requests, making the expected double-submit cookie unavailable. Production now sets cookies as `SameSite=None; Secure`; local development remains `SameSite=Strict` over localhost. The backend still requires the signed cookie/header pair and only permits explicitly configured CORS origins. Browsers that block third-party cookies may still prevent cross-site cookie auth; using the configured same-site/custom-domain arrangement or browser validation is necessary for those policies.

## Run tests and builds

Run commands from the relevant application directory:

```powershell
# Backend: unit/API tests. The MongoDB lifecycle suite runs only when MONGODB_URI is configured.
cd backend
npm test

# Frontend lint and production build
cd ..\frontend
npm run lint
npm run build
```

The backend tests exercise CSRF bootstrap, absent/invalid/expired tokens, accepted tokens through the middleware, CORS preflight, and cookie policy. With a configured test MongoDB replica set, `backend/tests/database.integration.test.js` exercises real registration/login/logout, authorization, links, redirects, analytics, QR metadata, expiry and other database workflows.

## Render deployment

The root `render.yaml` defines separate services, each scoped to its application directory. It can be used as a Blueprint or as a reference for manual service setup.

### Frontend — Render Static Site

- **Root directory:** `frontend`
- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- **Environment:**
  - `VITE_API_URL=https://linkpulse-ilrx.onrender.com`
  - `VITE_PUBLIC_SHORT_URL=https://linkpulse-ilrx.onrender.com`
- **Rewrite:** `/*` → `/index.html` (status 200) for SPA direct navigation and refreshes.

Changing Vite environment values requires a new static-site build/deploy because they are embedded at build time.

### Backend — Render Web Service

- **Root directory:** `backend`
- **Build command:** `npm install`
- **Start command:** `npm start`
- **Health check:** `/health/ready`
- **Environment:**
  - `NODE_ENV=production`
  - `MONGODB_URI` set to the production Atlas replica-set URI (secret).
  - `SESSION_SECRET` set to a unique random value of at least 32 characters (secret).
  - `FRONTEND_URL=https://linkpulse-1-m89v.onrender.com`
  - `CORS_ORIGINS=https://linkpulse-1-m89v.onrender.com`
  - `PUBLIC_SHORT_DOMAIN=https://linkpulse-ilrx.onrender.com`
  - `TRUST_PROXY=1`
  - Let Render assign `PORT`; do not hardcode a production port.

Keep `COOKIE_DOMAIN` empty unless all services use a controlled shared custom parent domain. The API binds to `0.0.0.0`, connects to MongoDB before full readiness, and exposes `/health` and `/health/ready`. Set Atlas Network Access to permit the Render service and use a replica-set-capable Atlas cluster.

## Troubleshooting and verification limits

- **Login/signup report a CSRF error:** Confirm the browser has accepted the backend's `lp_csrf` cookie, the frontend uses the correct `VITE_API_URL`, requests use credentials, and the frontend origin exactly matches `CORS_ORIGINS`. On Render, cookies must be `Secure; SameSite=None`.
- **CORS/network failure:** Check exact scheme/host values in `CORS_ORIGINS`, `FRONTEND_URL`, and `VITE_API_URL`. Do not include a path or trailing slash in origins.
- **`/health/ready` returns 503:** Check Atlas URI, credentials/password encoding, cluster connectivity, replica-set configuration, and Atlas Network Access.
- **Direct page refresh returns 404:** Configure the static-site SPA rewrite to `/index.html`.
- **Short links point to the wrong site:** Check `PUBLIC_SHORT_DOMAIN` and `VITE_PUBLIC_SHORT_URL`.
- **Password reset mail is not delivered:** Configure valid `SMTP_*` settings; the app does not pretend mail was sent when SMTP is unavailable.

Local tests and builds do not verify live Render settings, Atlas credentials/network access, browser cookie policy, real registration, or QR scanning. Those checks require the deployed services, a reachable test database, and a browser. No live production test is claimed by this repository change.
