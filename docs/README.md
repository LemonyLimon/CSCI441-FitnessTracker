# Documentation Index

This folder explains how this app works, how to run it, and how to safely change it (aligned with **workout-tracker-mini**).

## Documents

- `architecture.md`
  - system overview and runtime boundaries
  - core request/data flows
- `api-overview.md`
  - route-by-route API guide with auth requirements
  - request/response examples and common errors
  - beginner glossary
- `project-structure.md`
  - folder ownership and responsibilities
  - where new features should be added
- `development-workflow.md`
  - daily local dev loop
  - CI expectations and pre-merge checks
- `deployment.md`
  - Vercel + Render + Neon setup for this repo
  - required env vars and smoke verification
- `deployment/README.md`
  - ordered checklist: Neon pooler URL, Render Blueprint/manual, Vercel `VITE_*` build-time behavior, CORS loop
- `deployment/auth0-setup.md`
  - Auth0 application URLs, Render/Vercel env for OIDC Path A, split-deploy cookies, troubleshooting
- `app-startup-walkthrough.md`
  - timeline from `pnpm run dev` to first workout request
  - client -> API -> DB request path
- `app-presentation.md`
  - demo-oriented overview: database, server, client, and key files in the data flow
- `troubleshooting.md`
  - symptom-first fixes for common setup/runtime issues
- `accessibility-ui.md`
  - client themes, text scaling, and preferences vs API fields
- `plans/frontend-accessibility-updates-proposal.md`
  - PR review checklist for the accessibility/theme branch (merge risks and follow-ups)
- `plans/workout-weight-reps-persistence-proposal.md`
  - approved approach for persisting workout weight and reps via the API
- `proposals/auth0-oidc-path-a-build-proposal.md`
  - execution playbook for Auth0 OIDC (Path A): slices, env invariants, secrets/logging, rollback

## Suggested Reading Order (Novice)

1. `../README.md` (First 30 Minutes checklist)
2. `app-startup-walkthrough.md`
3. `api-overview.md`
4. `architecture.md`
5. `troubleshooting.md`

**Presenting or demoing:** read `app-presentation.md` first, then drill into `api-overview.md` and `project-structure.md` as needed.

## Documentation Maintenance Rules

- Update docs in the same pull request as behavior changes.
- Keep this folder implementation-aware (actual paths, real scripts).
- Prefer concise docs that explain "why" and "where", not line-by-line code.
- If a script or workflow changes, update `README.md` and this folder together.

## How To Update The Changelog

`CHANGELOG.md` lives at the project root and should be updated in every PR that changes behavior, architecture, tooling, or workflow.

- Add new entries under `## [Unreleased]` in the correct subsection:
  - `Added`
  - `Changed`
  - `Fixed`
  - `Removed`
- Write concise, user-facing summaries of impact (what changed and why it matters).
- Group related file changes into one bullet when possible.
- When cutting a release, move `Unreleased` entries into a dated/versioned section and reset `Unreleased`.

## Test Changed Script Note

For fast local feedback, run:

```sh
pnpm run test:changed
```

To override the diff base ref used by the script:

```sh
TEST_CHANGED_BASE=origin/main pnpm run test:changed
```

## Comment Standards

Use comments to improve maintainability for both humans and AI tools, not to restate obvious code.

- Add JSDoc-style comments to:
  - exported functions
  - non-trivial internal helpers
  - modules with setup/behavioral side effects
- Keep JSDoc concise and practical:
  - one sentence for purpose
  - include important behavior or constraints
  - mention notable return/throw behavior when not obvious
- Add inline comments only for complex logic:
  - fallback behavior
  - non-obvious control flow
  - performance/safety decisions
- Avoid noisy comments:
  - do not explain basic language syntax
  - do not duplicate variable names line-by-line
- If code changes alter behavior, update related comments in the same PR.

## Tailwind UI Standards

- Prefer Tailwind utility classes for component-level styling in `client/src`.
- Keep shared/global styles minimal in `client/src/index.css`.
- If class lists become hard to scan, extract reusable UI components in `client/src/components/ui` instead of adding custom CSS files.
- Use a consistent scale for spacing/colors/typography to keep the UI cohesive across features.
- Prefer `@/` imports (for example, `@/components/ui`, `@/lib`) instead of deep relative paths.

## Import Alias Standards

- In client code, prefer `@/` imports for `client/src/*` modules.
- In server code, prefer `@server/` imports for `server/*` modules.
- Use `@shared/` imports for contracts shared between client and server.
- Keep same-folder imports relative (for example, `./logger.js`) when that is clearer.

## Frontend State and Forms Guidance

- Keep API-backed UI state request-driven in feature components/services.
- Use local `useState` when state is owned by one component/screen.
- Add validation with Zod on the backend first, then optional client validation.
