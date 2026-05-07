# Development Workflow

This guide describes the daily loop for developing this app (same workflow as **workout-tracker-mini**).

## Git identity (GitHub)

Point Git at the **same name and email** you use on GitHub (the email must be **verified** in GitHub Settings → Emails) so pushes attribute commits to your profile:

```sh
git config --global user.name "Your Full Name"
git config --global user.email "your-verified-email@example.com"
```

Use `git config user.email` without `--global` in a single repo if you prefer a repo-specific override. Update these values whenever you rotate or change your GitHub commit address.

## Local Development Loop

1. Pull latest changes.
2. Ensure runtime tools are ready:
   - `nvm use` (if not in devcontainer)
   - `corepack enable`
3. Install dependencies: `pnpm install`
4. Ensure PostgreSQL is running.
5. Start the app:
   - `pnpm run dev`
   - or `pnpm run dev:fresh` for stale port cleanup
6. Make small iterative changes.
7. Before PR/merge, run:
   - `pnpm run lint`
   - `pnpm run tsc`
   - `pnpm run test`
   - `pnpm run build`

## Database Workflow

When schema changes are needed:

1. Update `database/schema.sql`.
2. Update `server/db/schema.ts`.
3. Generate migration: `pnpm run db:generate`.
4. Commit new migration files from `database/migrations/` and update [`database/drizzle-baseline-after-import.sql`](../database/drizzle-baseline-after-import.sql) with the new migration row/hash so `db:import` → `db:migrate` stays consistent on fresh databases.
5. Apply migration locally: `pnpm run db:migrate`.
6. Re-seed (if needed): `pnpm run db:seed`.

For full local reset/bootstrap:

```sh
pnpm run db:import
pnpm run db:migrate
pnpm run db:seed
```

## CI Workflow

CI should validate the same commands used locally:

1. `pnpm install --frozen-lockfile`
2. `pnpm run lint`
3. `pnpm run tsc`
4. `pnpm run test`
5. `pnpm run build`

## Deployment Workflow

This app uses split hosting (same model as **workout-tracker-mini** and the main app):

- Vercel: client build from `client/`
- Render: API service for `server/`
- Neon: managed Postgres

Use [`deployment.md`](deployment.md) for exact setup and env values.

## Branching Guidance

- Create short-lived feature branches from `main`.
- Keep PRs scoped (UI, API, DB, docs).
- Update docs in the same PR when behavior changes.
