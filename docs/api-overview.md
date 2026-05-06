# API Overview

This guide explains the mini app API in a beginner-friendly way.

## API Envelope

All JSON responses use a standard envelope:

- success: `{ "data": ..., "meta": { "requestId": "..." } }`
- error: `{ "error": { "code": "...", "message": "..." }, "meta": { "requestId": "..." } }`

Some deletes return `204 No Content` with no JSON body.

## Authentication Model

- `POST /api/auth/guest`
  - creates a guest user and returns JWT
- `POST /api/auth/sign-in`
  - signs in seeded or existing user with email/password and returns JWT
- Protected routes require:
  - `Authorization: Bearer <token>`

## Route Summary

### Public Routes

- `POST /api/auth/guest`
- `POST /api/auth/sign-in`
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

- `401 invalid_token`
  - missing/expired/bad JWT
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
- **Protected route**: endpoint that requires valid `Authorization: Bearer` token.

## Read Next

- [Startup walkthrough](app-startup-walkthrough.md)
- [Architecture](architecture.md)
- [Troubleshooting](troubleshooting.md)
