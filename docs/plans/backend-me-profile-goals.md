# Plan: `/api/me` profile, goals, and backend fixes

Branch: `backend-dev` (CSCI441-FitnessTracker).

## Goals

1. **Routes under `/api/me`** — Align with existing `GET /api/me` and `PATCH /api/me/preferences` instead of `/api/user/:id/...`.
2. **No secrets in JSON** — Never return `passwordHash` or any credential material; expose `hasPassword` when useful.
3. **`DELETE /api/me/profile` = reset optional fields** — Clear `height` and `payment_info` (and do not delete the user row). Full account deletion is a separate future endpoint.
4. **Migrations** — SQL migrations and `database/schema.sql` match Drizzle `schema.ts` (goals, exercises, extended user/workout columns).
5. **Tests & docs** — Real route tests committed; CHANGELOG accurate; remove stray `.gitignore` entries for test files.

## Implementation checklist

| Step | Task                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Extend `SessionUser` / `readMe()` with safe fields: `height`, `paymentInfo`, `hasPassword`, `createdAt`, `updatedAt` (ISO strings).                                |
| 2    | Shared **public user** serialization for `GET /api/me` and profile `POST`/`PUT`/`PATCH` responses (same shape where overlapping).                                  |
| 3    | Routes: `GET/POST/PATCH/PUT /api/me/profile`; `DELETE /api/me/profile` → `resetUserProfile`. Remove duplicate `GET .../profile` if fully covered by `GET /api/me`. |
| 4    | Goals: `GET/POST /api/me/goals`, `PATCH/DELETE /api/me/goals/:goalId`. Drop `:id` params.                                                                          |
| 5    | `resetUserProfile(userId)` — `UPDATE` only; set `height` and `paymentInfo` to `null`.                                                                              |
| 6    | `updateGoal` — partial PATCH (only defined body fields). Relax Zod on PATCH (no “at least one target” rule).                                                       |
| 7    | Add migration `0003_*` + update `meta/_journal.json` + `database/schema.sql`.                                                                                      |
| 8    | Tests: Supertest for 401, no password/hash in bodies, basic happy paths where DB available.                                                                        |
| 9    | Update `CHANGELOG.md`; remove incorrect test paths from `.gitignore`.                                                                                              |

## Out of scope (follow-up)

- `DELETE /api/me` or `/api/me/account` for true account deletion.

## References

- `server/routes/api.ts`
- `server/controllers/auth-controller.ts`, `profile-controller.ts`, `goal-controller.ts`
- `server/services/auth-service.ts`, `profile-service.ts`, `goal-service.ts`
