# Project Structure

This map helps new contributors find the right place for each change.

## Root

- `package.json`
  - workspace scripts (`dev`, `lint`, `tsc`, `test`, `build`)
- `pnpm-workspace.yaml`
  - links `client` and `server` packages
- `database/`
  - SQL schema, seed data, and generated migrations
- `docs/`
  - onboarding and architecture docs
- `shared/`
  - client/server shared API envelope types

## Frontend (`client`)

- `src/App.tsx`
  - main mini UI flow: login, accessibility preferences, exercises, workouts (create requires weight + reps; themes via `data-app-theme`)
- `src/components/PreferencesCard.tsx`, `src/components/EmptyWorkoutState.tsx`
  - preferences UI and empty workouts call-to-action
- `src/lib/ui-preferences.ts`
  - theme IDs, text-size scale, localStorage helpers for theme
- `src/styles/app-themes.css`
  - CSS variables per `data-app-theme`
- `src/main.tsx`
  - React mount entrypoint; imports global + theme stylesheets
- `src/test/`
  - MSW handlers and test setup for client behavior
- `src/lib/`
  - API error parsing and utility functions

### Frontend ownership guidance

- New workflow/UI behavior: start in `src/App.tsx`.
- Reusable helpers: add to `src/lib/`.
- API mock updates for tests: `src/test/handlers.ts`.

## Backend (`server`)

- `routes/api.ts`
  - all API route registration and auth middleware placement
- `controllers/`
  - request validation + response mapping:
  - `auth-controller.ts`
  - `exercise-type-controller.ts` (catalog: `/api/exercise-types`)
  - `exercise-controller.ts` (per-workout rows: `/api/exercises`)
  - `goal-controller.ts`, `profile-controller.ts`, `health-controller.ts`
  - `workout-controller.ts`
- `services/`
  - business logic + DB access:
  - `auth-service.ts`
  - `exercise-type-service.ts`
  - `exercise-service.ts`
  - `goal-service.ts`, `profile-service.ts`, `workout-service.ts`
- `db/schema.ts`
  - Drizzle table definitions
- `scripts/seed.ts`
  - idempotent seed logic for demo account + exercises

### Backend ownership guidance

- New endpoint: register in `routes/api.ts`, implement controller + service pair.
- Authorization/data ownership logic belongs in services.
- Request parsing and validation stays in controllers.

## Data Layer (`database`)

- `schema.sql`
  - canonical SQL schema for local import
- `data.sql`
  - seed exercise data
- `migrations/`
  - versioned SQL migrations and [`migrations/meta/_journal.json`](../database/migrations/meta/_journal.json) (must stay in sync with Drizzle)
- `drizzle-baseline-after-import.sql`
  - seeds `drizzle.__drizzle_migrations` after `schema.sql`/`data.sql` so `pnpm run db:migrate` does not re-apply migrations that already match the imported schema
- `import.sh`
  - runs the three SQL files above; respects an existing shell `DATABASE_URL` before sourcing `server/.env`

## Current Core Domain Objects

- `users`
  - guest/user identity, display name, accessibility preferences
- `exercise_types`
  - seeded global exercises + user custom exercises
- `workouts`
  - user-owned workouts with optional exercise link, **`userWeight`**, **`reps`**
- `exercises`
  - per-workout logged sets (linked to `exercise_types` via `type`); primary key **`exerciseId`**
- `goals`
  - user targets; primary key **`goalId`** in API responses (`GET/PATCH /api/me/goals`)

## Quick “Where Do I Edit?” Guide

- Login behavior: `server/controllers/auth-controller.ts`, `server/services/auth-service.ts`, `client/src/App.tsx`
- Workout CRUD: `server/controllers/workout-controller.ts`, `server/services/workout-service.ts`, `client/src/App.tsx`
- Exercise catalog CRUD: `server/controllers/exercise-type-controller.ts`, `server/services/exercise-type-service.ts`, `client/src/App.tsx`
- Per-workout exercise rows: `server/controllers/exercise-controller.ts`, `server/services/exercise-service.ts` (not wired in the demo UI yet)
- Docs updates: files in `docs/` + root `README.md`
