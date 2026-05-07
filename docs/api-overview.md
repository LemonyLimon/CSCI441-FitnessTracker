# API Overview

This guide explains the mini app API in a beginner-friendly way.

## API Envelope

All JSON responses use a standard envelope:

- success: `{ "data": ..., "meta": { "requestId": "..." } }`
- error: `{ "error": { "code": "...", "message": "..." }, "meta": { "requestId": "..." } }`

Some deletes return `204 No Content` with no JSON body.

## Authentication Model

**Demo / JWT (when `AUTH_DEMO_ENABLED` is true):**

- `POST /api/auth/guest` — creates a guest user; response includes JWT `token` and `user`
- `POST /api/auth/sign-in` — email/password; response includes JWT `token` and `user`

**Auth0 OIDC (when `AUTH_OIDC_ENABLED` is true):**

- `GET /api/auth/options` — public; **`Cache-Control: no-store`**; body includes `{ oidc, demo }` (same envelope as other JSON routes). Drives which sign-in UI the client shows.
- `GET /api/auth/oidc/login` — starts the OIDC code + PKCE flow; responds with **302** to the identity provider (not JSON).
- `GET /api/auth/oidc/callback` — OAuth redirect target; exchanges code for tokens and sets session cookies; may redirect to the SPA with `#oidc_token=<jwt>` when split-hosted (see [`deployment/auth0-setup.md`](deployment/auth0-setup.md)).
- `POST /api/auth/logout` — clears server session cookies (`Set-Cookie`); client should also discard any stored Bearer JWT.

**Protected routes** accept either:

- `Authorization: Bearer <token>` (JWT from guest, sign-in, or OIDC fragment handoff), **or**
- a valid **`ftrack_session`** HttpOnly cookie set after OIDC callback (same user identity as Bearer).

### Public Routes

- `GET /api/auth/options`
- `GET /api/auth/oidc/login` (302 when OIDC enabled; **404** JSON when disabled)
- `GET /api/auth/oidc/callback` (redirect when OIDC enabled; **404** JSON when disabled)
- `POST /api/auth/logout`
- `POST /api/auth/guest` (403 when demo disabled)
- `POST /api/auth/sign-in` (403 when demo disabled)
- `GET /api/health`
- `GET /api/ready`

### Protected Routes

- `GET /api/me` (includes profile fields such as `height`, `paymentInfo`, `hasPassword`, `createdAt`, `updatedAt`; responses never include password hashes)
- `PATCH /api/me/preferences` (JSON body may include `uiHighContrast` and/or `uiTextSize`; see below)
- `GET /api/me/goals`
- `POST /api/me/goals`
- `PATCH /api/me/goals/:goalId`
- `DELETE /api/me/goals/:goalId`
- `POST /api/me/profile`
- `PUT /api/me/profile`
- `PATCH /api/me/profile`
- `DELETE /api/me/profile` (clears optional profile fields such as `height` and `payment_info`; does not delete the account)
- `GET /api/workouts`
- `POST /api/workouts`
- `PATCH /api/workouts/:workoutId`
- `DELETE /api/workouts/:workoutId`
- `GET /api/exercises`
- `POST /api/exercises`
- `PATCH /api/exercises/:exerciseTypeId`
- `DELETE /api/exercises/:exerciseTypeId`

## Common Request Examples

### Guest Login

```http
POST /api/auth/guest
```

### User Sign-in

```http
POST /api/auth/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Create Workout

```http
POST /api/workouts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Upper Day",
  "notes": "Push and pull",
  "exerciseTypeId": 3,
  "userWeight": 135,
  "reps": 8
}
```

`userWeight` (positive number, stored as decimal) and `reps` (positive integer) are **required** on create. Responses include `userWeight` (string, for example `"135"`) and `reps` (number or `null` on older rows). `PATCH /api/workouts/:workoutId` may include `userWeight` and/or `reps` to update them.

### Update accessibility preferences

```http
PATCH /api/me/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "uiHighContrast": true,
  "uiTextSize": "large"
}
```

Supported `uiTextSize` values include `standard`, `medium`, `large`, `xl`, and legacy `normal` (treated like `standard` on the client). Only fields present in the body are updated.

### Create Custom Exercise

```http
POST /api/exercises
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Row Variation",
  "category": "resistance"
}
```

## Common Error Cases

- `401 invalid_token` / `401 authentication required`
  - missing/expired/bad JWT (Bearer), missing/invalid session cookie, or neither
- OIDC redirect errors (browser navigation, not always JSON)
  - after callback, the SPA may receive `?auth_error=` with values such as `state_mismatch`, `idp_error`, `state_expired`, `internal` (see client handling)
- `404 workout not found`
  - workout does not exist for current user
- `404 custom exercise not found`
  - editing/deleting non-owned custom exercise
- `400 validation_error`
  - body/param value fails schema validation

## Beginner Glossary

- **Guest account**: temporary-style account created with one click, still authenticated with JWT.
- **JWT**: signed token proving identity for protected API calls.
- **Seed exercise**: default exercise row created by `db:seed` (`userId = null`).
- **Custom exercise**: user-created exercise owned by exactly one user.
- **Ownership check**: DB query rule ensuring users can only mutate their own rows.
- **API envelope**: consistent JSON response wrapper (`data` or `error`, plus `meta`).
- **Protected route**: endpoint that requires a valid Bearer JWT **or** valid session cookie per server configuration.

## Read Next

- [Startup walkthrough](app-startup-walkthrough.md)
- [Architecture](architecture.md)
- [Troubleshooting](troubleshooting.md)
