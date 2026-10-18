# LinkPulse frontend

The React/Vite single-page application is deployable independently from the API.

## Local setup

From this directory:

```powershell
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Set `VITE_API_URL` and `VITE_PUBLIC_SHORT_URL` in `.env` to the backend's local origin. The backend must allow the frontend origin in `CORS_ORIGINS`.

## Build and checks

```powershell
npm run lint
npm run build
npm run preview
```

Only browser-public settings belong in `VITE_*` variables. Never put API secrets, database credentials, or session secrets in frontend environment variables.

## Render

Deploy as a Render Static Site with root directory `frontend`, build command `npm install && npm run build`, and publish directory `dist`. Set `VITE_API_URL=https://linkpulse-ilrx.onrender.com` and `VITE_PUBLIC_SHORT_URL=https://linkpulse-ilrx.onrender.com`. Configure a rewrite from `/*` to `/index.html` so direct visits and refreshes of application routes use the SPA entry point. The root [render.yaml](../render.yaml) contains this rewrite for Blueprint deployments.
