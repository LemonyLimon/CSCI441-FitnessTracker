# Changelog

All notable changes to CSCI441-FitnessTracker are documented in this file.

The format is inspired by Keep a Changelog and uses semantic-style version sections.

## [Unreleased]

### Changed

- **Breaking (API):** goal resources returned from `/api/me/goals` use field **`goalId`** instead of `id`. Exercise catalog routes live under **`/api/exercise-types`** (replacing the old `/api/exercises` catalog paths).
- **Database:** migration **`0006_exercise_goal_pk_names`** renames primary key columns to **`exerciseId`** (`exercises`) and **`goalId`** (`goals`) when legacy columns named **`id`** still exist (idempotent if `schema.sql` already used the new names). Existing databases at migration **0005** must run **`pnpm run db:migrate`** once to apply **0006**; [`database/drizzle-baseline-after-import.sql`](database/drizzle-baseline-after-import.sql) includes the matching migration hash for imports.
- **Tooling:** root **`pnpm run db:migrate`** runs [`scripts/db-migrate.mjs`](scripts/db-migrate.mjs) so failed runs print troubleshooting hints (Drizzle itself may show little output when `pnpm` wraps the process).
- Documentation refresh: [`docs/app-presentation.md`](docs/app-presentation.md) for demos; aligned [`docs/app-startup-walkthrough.md`](docs/app-startup-walkthrough.md), [`docs/architecture.md`](docs/architecture.md), [`docs/project-structure.md`](docs/project-structure.md), [`docs/development-workflow.md`](docs/development-workflow.md), [`docs/README.md`](docs/README.md), and root [`README.md`](README.md) with current DB import/migrate flow, workout fields, goals/profile routes, and client file map.
- Repository stack and application code aligned with **workout-tracker-mini** for parity (see [`docs/migration-from-mini.md`](docs/migration-from-mini.md)).

### Fixed

- Workout create form: `step="any"` on weight (and edit) number inputs so decimal weights are not blocked by browser default `step="1"` validation before `onSubmit` runs; clearer errors for missing title or session ([`client/src/App.tsx`](client/src/App.tsx)).
- Client API errors: show the first Zod validation path/message when the server returns `validation_error` details ([`client/src/lib/api-error.ts`](client/src/lib/api-error.ts)).
- Expanded [`docs/troubleshooting.md`](docs/troubleshooting.md) with database connectivity checks and guidance when `db:migrate` fails silently after schema drift.
- `pnpm run db:import` now runs [`database/drizzle-baseline-after-import.sql`](database/drizzle-baseline-after-import.sql) after the SQL import so `pnpm run db:migrate` succeeds on the same database. Import also preserves an existing `DATABASE_URL` instead of always overwriting it from `server/.env`.

### Added

- Split-host frontend support: optional `VITE_API_BASE_URL` resolved in the client via [`client/src/lib/api-base-url.ts`](client/src/lib/api-base-url.ts); [`client/.env.example`](client/.env.example) and [`client/vercel.json`](client/vercel.json) for Vercel SPA routing.
- Render Blueprint [`render.yaml`](render.yaml) (`csci441-fitness-tracker-api`, migrate + seed pre-deploy, `/api/health`).
- Step-by-step deployment doc [`docs/deployment/README.md`](docs/deployment/README.md).
- Workout **`reps`** column (`0004_workout_reps` migration) and required **`userWeight`** / **`reps`** on `POST /api/workouts`; optional on `PATCH`; API responses include both. See [`docs/plans/workout-weight-reps-persistence-proposal.md`](docs/plans/workout-weight-reps-persistence-proposal.md).
- Documentation for client accessibility UI ([`docs/accessibility-ui.md`](docs/accessibility-ui.md)), deployment env `DATABASE_SSL` ([`docs/deployment.md`](docs/deployment.md)), and `PATCH /api/me/preferences` request details ([`docs/api-overview.md`](docs/api-overview.md)).
- PR review proposal artifact for the accessibility/theme work ([`docs/plans/frontend-accessibility-updates-proposal.md`](docs/plans/frontend-accessibility-updates-proposal.md)).
- Added workout-tracker-mini application domain with JWT auth, workout CRUD, and exercise catalog CRUD.
- Added guest one-click auth flow and seeded user credential auth (`user@example.com`).
- Added accessibility preferences (`uiHighContrast`, `uiTextSize`) with `PATCH /api/me/preferences`.
- Added database tables for `users`, `exercise_types`, and `workouts` in SQL and Drizzle schema.
- Added seed logic for demo user and default exercise catalog.
- Added new core docs for novice onboarding:
  - `docs/api-overview.md`
  - `docs/deployment.md`
  - `docs/troubleshooting.md`
- Added a “First 30 Minutes” setup checklist to `README.md`.
- Added a beginner glossary in `docs/api-overview.md`.

- Established backend layering with concrete examples:
  - `server/app.ts` for app composition
  - `server/routes/api.ts` for route modules
  - `server/controllers/hello-controller.ts`
  - `server/controllers/health-controller.ts`
  - `server/services/health-service.ts`
  - `server/db/pool.ts`
- Added `GET /api/health` endpoint demonstrating route -> controller -> service -> db flow.
- Added project documentation set under `docs/`:
  - `docs/README.md`
  - `docs/architecture.md`
  - `docs/project-structure.md`
  - `docs/development-workflow.md`
  - `docs/templates/feature-doc-guide.md`
- Added CI workflow `/.github/workflows/ci.yml` for pull requests and manual runs.
- Added PR checklist `/.github/pull_request_template.md` with testing + documentation checks.
- Added docs-policy CI gate requiring docs updates when application/config files change.
- Added pnpm workspace file: `pnpm-workspace.yaml`.
- Added pnpm lockfile: `pnpm-lock.yaml`.
- Added full test scaffolding with Vitest across frontend and backend.
- Added frontend unit test setup (`client/src/test/setup.ts`) and sample component test (`client/src/App.test.tsx`).
- Added MSW-based frontend API mock pattern (`client/src/test/handlers.ts`, `client/src/test/server.ts`).
- Added backend sample tests:
  - `server/services/health-service.test.ts` (service unit tests with mocked db layer)
  - `server/routes/api.test.ts` (API route tests via Supertest)
- Added `pnpm run test:changed` for fast local feedback by running only tests related to changed files.
- Added runtime pinning with `.nvmrc` and `engines` in root `package.json`.
- Added server environment validation module (`server/config/env.ts`) using `zod`.
- Added structured logging via `pino` and request logging via `pino-http`.
- Added Drizzle ORM + Drizzle Kit integration with schema/migration scaffolding.
- Added example Drizzle-backed CRUD endpoints for the original baseline.
- Added idempotent database seed flow (`pnpm run db:seed`) in the initial baseline.

- Added goals CRUD API for the authenticated user:
  - `GET /api/me/goals`
  - `POST /api/me/goals`
  - `PATCH /api/me/goals/:goalId`
  - `DELETE /api/me/goals/:goalId`
- Added profile update API (profile fields also appear on `GET /api/me`):
  - `POST /api/me/profile`
  - `PUT /api/me/profile`
  - `PATCH /api/me/profile`
  - `DELETE /api/me/profile` clears optional fields (`height`, `payment_info`); does not delete the account.
- Extended `GET /api/me` with `height`, `paymentInfo`, `hasPassword`, `createdAt`, `updatedAt` (API responses never include password hashes).
- Added migration `0003_goals_profile_extensions` for `goals`, `exercises`, and extended `users` / `workouts` columns.
- Added auth coverage for `/api/me/goals` and `/api/me/profile` in `server/routes/api.test.ts`.

### Changed

- Rewrote core docs to match workout-tracker-mini flows instead of old baseline flows:
  - `docs/architecture.md`
  - `docs/app-startup-walkthrough.md`
  - `docs/project-structure.md`
  - `docs/development-workflow.md`
  - `docs/README.md`
- Upgraded development environment:
  - Devcontainer uses Node 22 via feature (`ghcr.io/devcontainers/features/node:1`).
  - Devcontainer uses persistent bind mount to `/workspace` from local folder.
- Migrated package management from npm to pnpm:
  - Added `packageManager` in root `package.json`.
  - Converted root scripts to `pnpm` commands.
  - Updated Husky pre-commit to `pnpm exec lint-staged`.
  - Updated CI and deploy workflows to use pnpm setup/install/run.
  - Updated docs and README commands from npm to pnpm.
- Hardened CI/CD and project workflow:
  - Deploy workflow updated to `actions/checkout@v4`.
  - Deploy script changed from force push to normal push (`git push origin main:pub`).
  - Added docs-policy + quality checks in CI pipeline.
- Upgraded major runtime/tooling stacks:
  - React 19 + Vite 7 (`client`)
  - Express 5 (`server`)
  - Node 22 (devcontainer/CI)
  - TypeScript/ESLint ecosystem refresh across root + client
  - Husky v9-compatible prepare/hook behavior
- Refactored server startup into bootstrap/app composition split:
  - `server.ts` now focuses on process startup.
  - `app.ts` handles middleware/routes/static/error wiring.
- Updated Express fallback route for Express 5 compatibility:
  - from `*` to `/{*path}`.
- Updated README to match current stack, setup, CI, docs-policy, and pnpm workflows.
- Updated CI to run tests (`pnpm run test`) alongside lint, typecheck, and build.
- Added minimum coverage thresholds in Vitest configs for frontend and backend.

### Fixed

- Resolved empty workspace issue in devcontainer by introducing explicit workspace bind mount.
- Fixed GitHub Actions failure (`Unable to locate executable file: pnpm`) by adding `pnpm/action-setup` before `actions/setup-node`.
- Removed Husky deprecation warning source by deleting deprecated `/.husky/_/husky.sh` and modernizing hook usage.

### Removed

- Removed npm lockfiles:
  - `package-lock.json`
  - `client/package-lock.json`
  - `server/package-lock.json`

## [2.0.0] - Initial Baseline

### Added

- Initial full-stack TypeScript project structure with:
  - React client (`client`)
  - Express server (`server`)
  - PostgreSQL scripts (`database`)
  - deployment workflow scaffold
