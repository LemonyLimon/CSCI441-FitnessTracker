# Troubleshooting

Use this page when setup or runtime behavior is not working as expected.

## Quick Checks First

1. `pnpm install` completed successfully.
2. `server/.env` has `DATABASE_URL`, `TOKEN_SECRET`, `CORS_ORIGIN`.
3. PostgreSQL is running.
4. `pnpm run db:import`, `pnpm run db:migrate`, and `pnpm run db:seed` were run (see [Database connection and migrations](#database-connection-and-migrations)).
5. `pnpm run dev` is running with both client and server processes.

## Database connection and migrations

### Check Postgres and `DATABASE_URL`

Commands assume `server/.env` exists (copy from `server/.env.example` if needed).

1. **Is Postgres accepting connections?**

```sh
pg_isready -h localhost -p 5432
```

2. **Does `DATABASE_URL` reach your database?** From the repo root (adjust nothing if you use the default URL shape):

```sh
set -a && . server/.env && set +a
psql "$DATABASE_URL" -c "select current_database(), current_user;"
```

- **`connection refused`**: Postgres is not running, or the host/port in `DATABASE_URL` is wrong (Docker Desktop often needs `host.docker.internal` instead of `localhost` from inside a container).
- **`password authentication failed` / `FATAL: role ... does not exist`**: User or password in `DATABASE_URL` does not match your local Postgres roles.
- **`FATAL: database ... does not exist`**: Create it first, for example `createdb your_db_name` (or `CREATE DATABASE ...` in `psql`).

3. **Hosted Postgres (Neon, Render, and so on)**  
   Use the provider’s full connection string. Optional env `DATABASE_SSL` in `server/.env` defaults to `auto`: SSL is off for typical local hostnames and on for remote hosts. If TLS errors persist, try `DATABASE_SSL=true` or `false` per [`docs/deployment.md`](deployment.md).

### `pnpm run db:migrate` exits with code 1 and almost no output

The root script runs Drizzle from `server/` and prints a short hint if migrate fails. The underlying Postgres error is usually emitted **above** that hint; if you still do not see it, run:

```sh
pnpm -C server exec drizzle-kit migrate 2>&1 | tee /tmp/migrate.log
```

`drizzle-kit migrate` records applied SQL in the `drizzle.__drizzle_migrations` table. A common failure mode is:

- Tables already exist (for example after `pnpm run db:import` **before** the import script applied the Drizzle baseline, or an old manual setup),
- but **`drizzle.__drizzle_migrations` is empty or missing rows** (new database file, restored dump without the `drizzle` schema, or someone truncated the table).

Then Drizzle tries to run the first migration again, hits “relation already exists”, and the CLI often returns **exit code 1 without a clear message**.

**Current repo behavior:** `pnpm run db:import` runs `database/drizzle-baseline-after-import.sql` after `schema.sql` and `data.sql`, so a **fresh** import + migrate sequence should succeed.

**Fix (existing database where you already ran import without baseline):** apply the baseline once, then migrate:

```sh
set -a && . server/.env && set +a
psql "$DATABASE_URL" -f database/drizzle-baseline-after-import.sql
pnpm run db:migrate
```

**Fix (local dev, destructive):** drop and recreate the database, then run the README order once:

```sh
# Example: recreate database named in DATABASE_URL (adjust name/user to match your machine)
dropdb your_database_name
createdb your_database_name
pnpm run db:import
pnpm run db:migrate
pnpm run db:seed
```

### Run migrations from the right place

`pnpm run db:migrate` at the repo root runs [`scripts/db-migrate.mjs`](../scripts/db-migrate.mjs), which executes `drizzle-kit migrate` in `server/` (same as `pnpm -C server db:migrate`). `server/drizzle.config.ts` uses `dotenv/config`, so **`DATABASE_URL` must be set in `server/.env`** (or already exported in the shell). Running `drizzle-kit` from a random directory without that env will fall back to a placeholder URL in config and fail to connect.

### API error: column `"paymentInfo"` does not exist (or other camelCase columns)

The Drizzle schema expects **camelCase** column names on `users`, `workouts`, `exercises`, and `goals` (see migrations **`0005`** and **`0006`**). If Postgres still has legacy names such as `payment_info`, the server will 500 on queries until migrations are applied.

1. Confirm columns: `psql "$DATABASE_URL" -c '\d+ users'` — you should see `paymentInfo`, not `payment_info`.
2. Apply pending migrations: `pnpm run db:migrate` (after `pnpm run db:import` on a fresh DB, or on an existing DB that already matches `schema.sql` plus baseline).

Migration **`0006`** renames primary keys only when a legacy **`id`** column is still present, so `db:import` from a `schema.sql` that already defines `exerciseId` / `goalId` will not fail that step.

### Cannot create workouts (or red “Server error” / kicked back to sign-in)

Workout create/list now expect a **`reps`** column on `workouts` (migration `0004_workout_reps`). If the API code is newer than your database:

- **`POST /api/workouts`** can return **500** (“Server error…”) when inserting.
- **`GET /api/workouts`** during initial load can also fail; the app may clear your session and show a hydrate error.

**Fix:** apply migrations against the database in `server/.env`, then restart the API:

```sh
pnpm run db:migrate
```

Confirm the column exists:

```sh
set -a && . server/.env && set +a
psql "$DATABASE_URL" -c "\d+ public.workouts"
```

You should see `reps` in the column list. Also ensure **Weight** and **Reps** on the create form are filled with valid numbers (reps must be a whole number greater than 0).

If **Create workout** appears to do nothing at all: the workout **title** must be non-empty (you will see an error banner if it is missing). For **decimal weights** (for example `67.5`), the weight field uses `step="any"` so the browser does not block submit; if you still see no response, open DevTools → **Network** and confirm `POST /api/workouts` is sent and inspect the response status.

## Symptom -> What To Check

| Symptom                                       | What to check                                                                                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cannot login as guest                         | Confirm API is running and `POST /api/auth/guest` returns `201`. Check server logs for DB connectivity failures.                                                                       |
| `401 invalid access token` on protected route | Ensure `Authorization: Bearer <token>` is sent. Re-login to refresh token.                                                                                                             |
| `database is not configured` error            | Verify `DATABASE_URL` in `server/.env` and restart server process after env changes.                                                                                                   |
| Workouts not appearing                        | Confirm you are authenticated and calling `GET /api/workouts` with token.                                                                                                              |
| Cannot edit/delete custom exercise            | Ensure exercise is custom and owned by current user (seed exercises are read-only).                                                                                                    |
| Browser CORS error                            | `CORS_ORIGIN` must exactly match client origin (`http://localhost:5173` in dev).                                                                                                       |
| App loads but API requests fail               | Verify Vite proxy and API server port (`8080`) are both running.                                                                                                                       |
| `db:migrate` fails with no useful message     | Often empty `drizzle.__drizzle_migrations` while tables exist; see [Database connection and migrations](#database-connection-and-migrations).                                          |
| Cannot create workouts / session resets       | Often missing `reps` column or other migration drift; run `pnpm run db:migrate` and see [Cannot create workouts](#cannot-create-workouts-or-red-server-error--kicked-back-to-sign-in). |

## Useful Commands

```sh
pnpm run dev:fresh
pnpm run db:import
pnpm run db:seed
pnpm run lint
pnpm run tsc
pnpm run test
pnpm run build
```

## Manual API Sanity Checks

From a separate terminal:

```sh
curl -i http://localhost:8080/api/health
curl -i http://localhost:8080/api/ready
curl -i -X POST http://localhost:8080/api/auth/guest
```

If `/api/ready` returns `503`, fix DB/env before debugging UI issues.

## When to Reset Local DB

If schema/seed data feels out of sync:

```sh
pnpm run db:import
pnpm run db:seed
```

Then restart dev server.
