# LinkPulse API

Base URL: `http://localhost:4000`. JSON endpoints are under `/api`; `GET /:code` is the public short-link redirect. Error responses use `{ "error": { "code", "message", "details?", "requestId" } }`.

## Runtime and configuration

Copy `backend/.env.example` to `backend/.env`. The API loads `backend/.env` and then root `.env`. The Atlas URI is intentionally a placeholder; replace it with a real URI. Without `MONGODB_URI`, `/health` reports `database.connected: false`, readiness returns 503, and database-backed routes return 503.

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | HTTP listen port (default `4000`) |
| `FRONTEND_URL` | UI origin and destination for redirect states |
| `CORS_ORIGINS` | Comma-separated exact origin allowlist |
| `MONGODB_URI` | MongoDB Atlas/replica-set connection string |
| `SESSION_SECRET` | HMAC key; production requires at least 32 characters |
| `COOKIE_DOMAIN` | Optional shared cookie domain |
| `TRUST_PROXY` | Number of trusted proxy hops (`0` by default) |
| `SESSION_TTL_DAYS` | Session lifetime, 1–90 days |
| `PASSWORD_RESET_TTL_MINUTES` | Reset token lifetime, 5–120 minutes |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP transport settings |
| `SMTP_USER`, `SMTP_PASSWORD` | Optional SMTP authentication |
| `EMAIL_FROM` | Password-reset sender |
| `PUBLIC_SHORT_DOMAIN` | Absolute public short-link origin |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Explicit development-only seed identity |

All mutating `/api` requests require a CSRF token. First call `GET /api/auth/csrf` with credentials enabled, keep the `lp_csrf` cookie, and send the returned token in `X-CSRF-Token`. Authentication uses the HTTP-only `lp_session` cookie. Cookies use `SameSite=Strict`; production cookies are `Secure`.

Passwords use Node.js scrypt. Session/reset tokens are random and only their SHA-256 hashes are stored. Link destinations are validated as absolute HTTP(S) URLs without credentials; the API does not fetch destinations. Click events store no raw IP address. Visitor estimates use an HMAC of the address and user-agent, bucketed by calendar month; rotating `SESSION_SECRET` resets continuity. Click history and expired/disabled links are retained; there is no TTL deletion index on links or click events. Sessions alone have an expiry TTL index.

## Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness plus actual MongoDB configured/connected state |
| `GET` | `/health/ready` | Readiness; HTTP 503 while MongoDB is disconnected |

## Authentication

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/csrf` | Issue CSRF cookie and return token; works without MongoDB |
| `POST` | `/api/auth/register` | Register a regular user and set session cookie |
| `POST` | `/api/auth/login` | Sign in and set session cookie |
| `POST` | `/api/auth/logout` | Revoke current cookie token and clear cookies |
| `GET` | `/api/auth/me` | Current active user |
| `POST` | `/api/auth/password/forgot` | Request reset email; returns a generic response when delivery succeeds (SMTP failures are surfaced) |
| `POST` | `/api/auth/password/reset` | Consume one-time reset token and revoke all sessions |
| `GET`, `PATCH` | `/api/account/profile` | Read or update the authenticated user's name and email |
| `GET`, `PATCH` | `/api/account/preferences` | Read or update theme, email-update, and weekly-summary preferences |

Registration accepts only `name`, `email`, and `password`; the role is never accepted from public input.

## Links and redirects

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/links` | Owner-scoped search, filters, sorting, pagination |
| `POST` | `/api/links` | Create short link |
| `POST` | `/api/links/import` | Multipart CSV (`file` field), up to 2 MB/1000 rows, row-level results |
| `GET` | `/api/links/alias/:alias/availability` | Check global alias availability |
| `GET` | `/api/links/:id` | Get owned link |
| `PATCH` | `/api/links/:id` | Update owned link |
| `DELETE` | `/api/links/:id` | Disable (does not delete) owned link |
| `GET` | `/api/links/:id/qr` | Return QR generation metadata for an enabled link |
| `GET` | `/api/links/:id/analytics` | Analytics filtered to an owned link |
| `POST` | `/api/links/public/:code/unlock` | Verify password and set short-lived unlock cookie |
| `GET` | `/:code` | Public redirect; disabled/limited links go to `/link/disabled`, expired links to `/link/expired`, unknown codes to `/link/not_found`, and protected links to `/s/locked?code=…` on `FRONTEND_URL` (UI-state responses use a non-cacheable 302) |

Create-link JSON fields: `destination` (required), `alias`, `title`, `campaignId`, `folderId`, `tagIds`, `expiresAt`, `maxClicks`, `password`, and `qrEnabled`. Alias codes are globally unique. Defaults and statuses are validated; an administrator-taken-down link cannot be reactivated by its owner. Click caps are enforced with a conditional atomic MongoDB update inside a transaction paired with click-event creation. Atlas/replica-set transactions are required for counted redirects. Known crawler/preview traffic redirects without incrementing click counts or generating analytics events.

CSV requires a header row with `destination`, `url`, or `long_url`; optional columns are `alias` and `title`. Each row is validated independently. The response contains row numbers and valid/invalid results.

## Workspace resources and analytics

All routes below require an authenticated session and scope records to the current user.

| Method | Path | Description |
|---|---|---|
| `GET`, `POST` | `/api/campaigns` | List/create campaigns |
| `PATCH`, `DELETE` | `/api/campaigns/:id` | Update/archive; archiving detaches active links but retains campaign history |
| `GET`, `POST` | `/api/tags` | List/create tags |
| `PATCH`, `DELETE` | `/api/tags/:id` | Update/delete; deleting detaches links |
| `GET`, `POST` | `/api/folders` | List/create folders |
| `PATCH`, `DELETE` | `/api/folders/:id` | Update/delete; deleting detaches links and children |
| `GET`, `PUT` | `/api/bio` | Read/upsert current user's bio page |
| `GET` | `/api/bio/:slug` | Read published public bio page |
| `GET` | `/api/analytics` | Workspace clicks, trends, visitors, sources, devices, browsers, campaigns, top links |
| `GET` | `/api/analytics/campaigns/:id` | Owner-scoped campaign analytics |
| `POST` | `/api/reports` | Submit public abuse report |

Analytics accept optional ISO `from`, `to`, `campaignId`, `linkId`, and `groupBy` (`day`, `week`, `month`) query parameters. Date ranges are limited to 366 days. Standard pagination uses `page` (default 1) and `limit` (default 20, maximum 100).

## Administration

Every `/api/admin` route requires an authenticated `admin` role.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/analytics` | Platform-wide analytics |
| `GET` | `/api/admin/links` | Search/filter platform links |
| `PATCH` | `/api/admin/links/:id/takedown` | Disable a link with reason and audit record |
| `PATCH` | `/api/admin/links/:id/restore` | Restore link with reason and audit record |
| `GET` | `/api/admin/users` | Search/filter users |
| `PATCH` | `/api/admin/users/:id/status` | Activate/suspend user; suspending revokes sessions |
| `GET` | `/api/admin/abuse-reports` | List abuse reports |
| `PATCH` | `/api/admin/abuse-reports/:id` | Set review status and resolution |
| `GET`, `POST` | `/api/admin/blocked-domains` | List/add blocked destination domains |
| `DELETE` | `/api/admin/blocked-domains/:id` | Remove a blocked domain |
| `GET`, `PATCH` | `/api/admin/settings` | Read/update registration, maintenance, and default-limit settings |
| `GET` | `/api/admin/audit-logs` | Paginated audit history |

Public APIs cannot assign roles. The development seed only creates an admin for an explicitly configured, unused email and refuses to elevate an existing non-admin account.

## Commands

```sh
npm run backend:dev
npm run backend:start
npm run backend:test
npm run seed:demo
```

Tests that require no MongoDB run with `npm run backend:test`. Database integration and transaction behavior must be verified against a configured replica-set database before production deployment.
