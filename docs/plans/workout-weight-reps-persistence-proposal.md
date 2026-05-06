# Proposal: Persist workout weight and reps (required on create)

**Status:** Approved — implemented on `main`  
**Goal:** Align the UI with the API so validated **weight** and **reps** are stored and returned, not discarded.

## Product decisions

| Decision                           | Choice                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Create (`POST /api/workouts`)      | **`userWeight` and `reps` are required** (positive decimal weight, positive integer reps).                                                  |
| Read (`GET /api/workouts`)         | Return `userWeight` (nullable for legacy rows) and `reps` (nullable until backfilled).                                                      |
| Update (`PATCH /api/workouts/:id`) | **`userWeight` and `reps` optional** in the JSON body; when present, same validation as create. Edit form will send current values on Save. |
| Storage                            | **`user_weight`** (existing `numeric(10,2)` on `workouts`) + new **`reps`** `integer` column on `workouts`.                                 |

Rationale: Child table `exercises` already has `reps`/`weights` but requires a linked exercise type; the create form allows “No exercise linked”, so session-level reps belong on `workouts`.

## Implementation checklist

1. **Database:** Drizzle schema + migration `0004_workout_reps.sql` + [`database/schema.sql`](../../database/schema.sql) parity; [`database/drizzle-baseline-after-import.sql`](../../database/drizzle-baseline-after-import.sql) includes migration `0004` journal hash.
2. **Server:** Zod + [`workout-service.ts`](../../server/services/workout-service.ts) + [`workout-controller.ts`](../../server/controllers/workout-controller.ts) `serializeWorkout`.
3. **Client:** [`client/src/App.tsx`](../../client/src/App.tsx) types, create/edit payloads, list display; [`client/src/test/handlers.ts`](../../client/src/test/handlers.ts) MSW.
4. **Tests:** [`server/routes/domain-routes.test.ts`](../../server/routes/domain-routes.test.ts), [`client/src/App.test.tsx`](../../client/src/App.test.tsx).
5. **Docs:** [`docs/api-overview.md`](../api-overview.md), [`CHANGELOG.md`](../../CHANGELOG.md).

## Risks

- **Legacy rows:** Workouts created before this change have `reps` null; UI should tolerate null when displaying lists.
- **Baseline SQL:** Forgetting to add the new migration row breaks `db:import` → `db:migrate` for fresh clones.
