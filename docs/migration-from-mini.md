# Migration from workout-tracker-mini

This repository was aligned to **[workout-tracker-mini](https://github.com/)** (local source of truth) for stack, features, and tooling.

## Source snapshot

| Field | Value |
| --- | --- |
| **Source repo** | `workout-tracker-mini` (sibling clone or path on disk) |
| **Source git SHA** | `3dea406` (completed creation of new rules for learning) |
| **Migration started** | 2026-04-07 |

## Rules

- **Course branding** is preserved in root `package.json` (`name`, `description`) and README intro after the conversion; dependencies and scripts match mini unless noted.
- **Copy exclusions** when syncing from mini: `.git`, `node_modules`, `client/node_modules`, `server/node_modules`, `.pnpm-store`, `dist`, coverage outputs, `.env` files.
- **Database:** Treat as **greenfield**. Existing databases from the pre-mini template are **not** migrated—create a new database or drop/recreate, then `pnpm run db:import`, `pnpm run db:migrate`, `pnpm run db:seed`.

## Verification (parity with mini)

From repo root:

```sh
corepack enable
pnpm install
pnpm run install:env
# Edit server/.env: DATABASE_URL, TOKEN_SECRET, CORS_ORIGIN=http://localhost:5173
pnpm run db:import
pnpm run db:migrate
pnpm run db:seed
pnpm run lint
pnpm run tsc
pnpm run test
pnpm run build
```

## Deploy (GitHub Actions)

After conversion, confirm repository secrets for the deploy workflow (e.g. `EC2_HOST`, `SSH_PRIVATE_KEY`) match your hosting setup. Workflows live under `.github/workflows/`.

## Instructor checklist

- [ ] Mini SHA recorded above updated if re-synced from a newer mini commit
- [ ] Full verification commands passed locally
- [ ] First deploy to `pub` monitored or smoke-tested
