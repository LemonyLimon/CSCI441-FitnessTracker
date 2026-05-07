# CSCI441 Fitness Tracker

Course project repository. The **stack, scripts, and features** match [`workout-tracker-mini`](https://github.com/) (see [`docs/migration-from-mini.md`](docs/migration-from-mini.md) for the source snapshot and verification checklist).

**What you get:** JWT login (`Continue as guest` and email/password), optional **Auth0 OIDC** (`Continue with Auth0`) when enabled on the API, workout CRUD, exercise catalog (seeded + custom), accessibility preferences (high-contrast **themes**, scaled **text size**, and `PATCH /api/me/preferences`), and the same deployment model as the reference mini app. OIDC env and Auth0 dashboard setup: [`docs/deployment/auth0-setup.md`](docs/deployment/auth0-setup.md). See [`docs/accessibility-ui.md`](docs/accessibility-ui.md) for UI behavior and [`docs/plans/frontend-accessibility-updates-proposal.md`](docs/plans/frontend-accessibility-updates-proposal.md) for a structured PR review proposal.

## First 30 Minutes (Quickstart)

Use this checklist for your first successful run.

1. Install dependencies

```sh
corepack enable
pnpm install
pnpm run install:env
```

2. Configure environment in `server/.env`

Required values:

- `DATABASE_URL`
- `TOKEN_SECRET`
- `CORS_ORIGIN=http://localhost:5173`

Optional:

- `DATABASE_SSL` — `auto` (default), `true`, or `false`. Controls Postgres TLS for the API: `auto` disables SSL for typical local hosts and enables it for remote URLs (for example Neon). See [`docs/deployment.md`](docs/deployment.md).

3. Create and seed database

```sh
createdb <your_database_name>
pnpm run db:import
pnpm run db:migrate
pnpm run db:seed
```

`db:import` loads `database/schema.sql`, `database/data.sql`, and then `database/drizzle-baseline-after-import.sql` so Drizzle’s migration journal matches the imported schema. That way `db:migrate` does not try to create tables that already exist.

4. Start the app

```sh
pnpm run dev
```

5. Verify success

- Open `http://localhost:5173`
- Click `Continue as guest`, or sign in with demo account
- Create one custom exercise
- Create one workout (fill **title**, **weight**, and **reps**), then delete it

If any step fails, start with [`docs/troubleshooting.md`](docs/troubleshooting.md).

After you deploy the API (e.g. Render), you can run `DEPLOY_URL=https://<your-api-host> pnpm run smoke:deploy` from the repo root for automated health/auth checks—see [`docs/deployment/auth0-setup.md`](docs/deployment/auth0-setup.md).

## Demo Account

`pnpm run db:seed` creates this account if it does not exist:

- email: `user@example.com`
- password: `password123`

## API at a Glance

Public routes (see [`docs/api-overview.md`](docs/api-overview.md) for OIDC paths):

- `GET /api/auth/options`
- `POST /api/auth/guest`
- `POST /api/auth/sign-in`
- `POST /api/auth/logout`
- OIDC: `GET /api/auth/oidc/login`, `GET /api/auth/oidc/callback` (when enabled)

Protected routes (Bearer JWT and/or OIDC session cookie per server):

- `GET /api/me`
- `PATCH /api/me/preferences`
- Goals and profile under `/api/me/goals` and `/api/me/profile` (see API doc)
- `GET|POST|PATCH|DELETE /api/workouts...`
- `GET|POST|PATCH|DELETE /api/exercises...`

Full route list and JSON examples: [`docs/api-overview.md`](docs/api-overview.md)

## Deployment Model

The app uses the same split deployment strategy as `workout-tracker`:

- Vercel: frontend (`client`)
- Render: backend API (`pnpm run start`)
- Neon: Postgres

Deployment guides: step-by-step [`docs/deployment/README.md`](docs/deployment/README.md); env/command quick reference [`docs/deployment.md`](docs/deployment.md).

## Read Next

- [Documentation index](docs/README.md)
- [App presentation (demo walkthrough)](docs/app-presentation.md) — database, server, client, and key files in the request path
- [Architecture and data flow](docs/architecture.md)
- [Startup walkthrough](docs/app-startup-walkthrough.md)
- [Troubleshooting](docs/troubleshooting.md)
