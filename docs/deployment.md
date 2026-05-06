# Deployment (Vercel + Render + Neon)

**Step-by-step (Neon pooler, Blueprint secrets, Vercel redeploys):** see [`deployment/README.md`](deployment/README.md).

This mini app follows the same split deployment strategy as the main project.

## Hosting Split

- **Vercel**: frontend app from `client/`
- **Render**: Node API server
- **Neon**: PostgreSQL database

## Required Environment Variables

### Render (API)

- `DATABASE_URL` = Neon **pooled** connection string (recommended for server traffic; avoids connection limit issues on small tiers)
- `TOKEN_SECRET` = long random string
- `CORS_ORIGIN` = Vercel app URL (for example `https://your-mini.vercel.app`)
- `DATABASE_SSL` (optional, default `auto`) — passed to the Node `pg` pool: `auto` turns SSL **off** for typical local hosts (`localhost`, loopback) and **on** for other hostnames (for example Neon). Set `true` or `false` to override detection.
- Optional rate limit tuning:
  - `RATE_LIMIT_WINDOW_MS`
  - `RATE_LIMIT_MAX`
  - `RATE_LIMIT_WRITE_MAX`

### Vercel (Client)

- `VITE_API_BASE_URL` = Render API URL (for example `https://your-mini-api.onrender.com`). This value is **embedded at build time**; change it in the Vercel dashboard only together with a **redeploy**.
- Local dev: leave empty and rely on the Vite dev proxy (`client/vite.config.ts` proxies `/api` to `http://localhost:8080`). See [`client/.env.example`](../client/.env.example).

Never put backend secrets in `VITE_*`.

## Build/Run Commands

Render API service should use:

- Build: `corepack enable && pnpm install --frozen-lockfile && pnpm run build`
- Pre-deploy: `corepack enable && pnpm run db:migrate && pnpm run db:seed`
- Start: `corepack enable && pnpm run start`
- Health: `/api/health`

Vercel client:

- Root directory: `client`
- Build command: `pnpm run build`
- Output directory: `dist`

## Deployment Verification

After deploy:

1. Open `https://<render-api>/api/health` (expect `200`).
2. Open Vercel app URL.
3. Test `Continue as guest`.
4. Create custom exercise + workout.
5. Confirm workout list loads on refresh.

## Troubleshooting Deployment

- `401/403` from browser: confirm `CORS_ORIGIN` matches Vercel URL exactly.
- Client still calling localhost: set `VITE_API_BASE_URL` in Vercel.
- DB errors on first request: confirm migrations and seed ran in pre-deploy step.
