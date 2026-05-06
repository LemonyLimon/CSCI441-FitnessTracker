# Proposal: `frontend-accessibility-updates` PR review

**Status:** Review artifact (pre-merge checklist)  
**Base:** `main`  
**Branch:** `frontend-accessibility-updates`  
**Intent:** Record findings from accessibility/UI review so the team can merge with eyes open.

## Summary of changes (branch vs `main`)

- **Client:** Multi-theme CSS variable system (`data-app-theme`), Lexend font, root font scaling for text sizes, `PreferencesCard` + `EmptyWorkoutState`, workout create form validation (weight/reps) with ARIA/live regions, success toast, broader focus-visible styling.
- **Server:** Expanded `PATCH /api/me/preferences` `uiTextSize` validation (`standard`, `medium`, `large`, `xl`, legacy `normal`); partial updates in `updateMyPreferences`; `DATABASE_SSL` (`auto` | `true` | `false`) and Postgres pool SSL behavior for local vs remote hosts.

## Merge recommendation

**Approve with changes** unless the team explicitly accepts the product/behavior risks below.

## Must-fix or confirm

1. **Weight and reps** — The create-workout form requires positive weight/reps but the `POST /api/workouts` body does not include them; values are validated then discarded. Decide: persist via API (and schema), remove fields, or make optional with clear copy.
2. **Legacy `uiHighContrast`** — On login, if no theme is stored in `localStorage`, UI defaults to `standard` and may `PATCH` the server to `uiHighContrast: false`, overwriting users who only had the old checkbox set. Prefer deriving initial theme from `user.uiHighContrast` when storage is empty, or avoid auto-PATCH until the user changes preferences.
3. **Polish** — Remove stray `// Crea` in `client/src/components/EmptyWorkoutState.tsx`.

## Should address (medium)

- Prefer omitting `aria-invalid` when valid instead of `aria-invalid="false"` on workout inputs.
- Optional: reduce nested `<section>` noise (`PreferencesCard` inside profile `<section>`).
- Optional: revisit `aria-live` on static empty workout state.
- Document `DATABASE_SSL` for operators (see [`docs/deployment.md`](../deployment.md)).
- Run full quality gate before merge: `pnpm run lint`, `pnpm run tsc`, `pnpm run test`, `pnpm run build`.

## Additional verification

- **React StrictMode:** Confirm theme sync does not double-`PATCH` preferences in dev on mount; add a guard if needed.
- **Focus management:** After failed validation, focus first invalid field (optional WCAG polish).
- **Tests:** Optional supertest cases for new `uiTextSize` values on `PATCH /api/me/preferences`.
- **Manual:** Short screen-reader pass on preferences and success toast.

## Related docs

- [`docs/accessibility-ui.md`](../accessibility-ui.md) — product-oriented description of themes, text size, and preferences API.
- [`docs/api-overview.md`](../api-overview.md) — `PATCH /api/me/preferences` request shape.
