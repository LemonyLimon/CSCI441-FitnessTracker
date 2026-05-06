# Deployment guide (Neon + Render + Vercel)

Step-by-step hosting for this app: **Neon** (Postgres), **Render** (Express API), **Vercel** (Vite SPA). Env variable names match this codebase (`DATABASE_SSL`, not `DB_SSL`).

For a shorter env/command reference, see [`../deployment.md`](../deployment.md).

## 1) Neon

1. Create a project and database in a region close to your Render region.
2. Copy the **pooled** connection string (Neon’s “pooled” / pooler endpoint—use this for `DATABASE_URL` on Render so small plans do not exhaust `max_connections`).
3. Ensure the URL includes TLS (for example `sslmode=require` in the query string, depending on Neon’s copy UI).

Do not commit the connection string; set it only in Render.

## 2) Render (API)

### Option A — Blueprint (recommended)

1. In Render: **New** → **Blueprint**, connect this Git repository.
2. Render reads [`render.yaml`](../../render.yaml) from the repo root.
3. In the dashboard, set secret / `sync: false` values before the first successful deploy:
   - `DATABASE_URL` — Neon pooled URL
   - `CORS_ORIGIN` — your Vercel production origin (for example `https://your-app.vercel.app`). Use a comma-separated list if you need multiple exact origins (there is no wildcard for all Vercel previews).

### Option B — Manual Web Service

- **Root directory:** repository root (`.`).
- **Build command:** `corepack enable && pnpm install --frozen-lockfile && pnpm run build`
- **Pre-deploy command:** `corepack enable && pnpm run db:migrate && pnpm run db:seed`
- **Start command:** `corepack enable && pnpm run start`
- **Health check path:** `/api/health`
- **Node version:** 22

### Render environment variables

| Key            | Notes                                                   |
| -------------- | ------------------------------------------------------- |
| `NODE_ENV`     | `production`                                            |
| `DATABASE_URL` | Neon pooled connection string                           |
| `DATABASE_SSL` | `true` on Render (also set in `render.yaml` by default) |
| `TOKEN_SECRET` | Long random string (Blueprint can generate)             |
| `CORS_ORIGIN`  | Vercel site origin(s), comma-separated                  |
| `RATE_LIMIT_*` | Optional; defaults match `render.yaml`                  |

After deploy, confirm: `https://<your-service>.onrender.com/api/health` returns **200**.

## 3) Vercel (frontend)

1. **New project** → import the same Git repository.
2. **Root directory:** `client`
3. **Framework:** Vite
4. **Build command:** `pnpm run build`
5. **Output directory:** `dist`
6. **Environment variable (Production):** `VITE_API_BASE_URL` = `https://<your-render-service>.onrender.com` (no trailing slash).

`VITE_*` variables are **baked in at build time**. After changing `VITE_API_BASE_URL`, trigger a **new deployment** on Vercel.

This repo includes [`client/vercel.json`](../../client/vercel.json) so client-side routes refresh correctly (SPA fallback to `index.html`).

## 4) Close the loop

1. Set Render `CORS_ORIGIN` to match your **exact** Vercel URL (`https://…vercel.app` or custom domain).
2. Redeploy Render if you changed env only.
3. Smoke-test: open the Vercel URL, use **Continue as guest**, create a workout, refresh the list.

## Pre-deploy seed

[`server/scripts/seed.ts`](../../server/scripts/seed.ts) is written to be safe to re-run (skips demo user if present; skips catalog seed if global exercises already exist). If you customize seeding to be non-idempotent, remove `db:seed` from the Render pre-deploy command after the first successful bootstrap.

## Troubleshooting

See [`../deployment.md`](../deployment.md) § _Troubleshooting Deployment_ and [`../troubleshooting.md`](../troubleshooting.md).
