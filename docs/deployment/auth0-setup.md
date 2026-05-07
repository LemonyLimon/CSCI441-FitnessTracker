# Auth0 OIDC (Path A) setup

This app supports **Auth0** as an OpenID Connect provider using the same pattern as **workout-tracker**: `openid-client` + PKCE, signed cookies for the OIDC handshake and optional session, and an optional **`#oidc_token=`** URL fragment so a **Vercel** SPA can receive a Bearer JWT after the callback runs on **Render**.

For the implementation playbook (build slices, invariants, rollback), see [`../proposals/auth0-oidc-path-a-build-proposal.md`](../proposals/auth0-oidc-path-a-build-proposal.md).

## Post-deploy API smoke (optional)

After the Render service is live, you can run the repo smoke script against the **API origin** (same host as `/api/*`), **not** the Vercel SPA URL:

```bash
DEPLOY_URL=https://<your-render-service>.onrender.com pnpm run smoke:deploy
```

This checks `GET /api/health`, `GET /api/auth/options` (must send **`Cache-Control: no-store`**), and unauthenticated **401** responses on `GET /api/workouts` and `GET /api/me`. **No credentials or secrets** are required—only the public base URL.

## Auth0 application settings

1. **Application type:** Regular Web Application (or equivalent that supports authorization code + PKCE).
2. **Allowed Callback URLs:** must match **`AUTH_OIDC_REDIRECT_URI`** **exactly** (scheme, host, path, no trailing newline). Paste from Render/Vercel dashboard with care; the server trims whitespace, but Auth0’s UI must match.
   - **Local dev (recommended):** `http://localhost:5173/api/auth/oidc/callback` so the browser stays on the Vite origin and the dev proxy forwards `/api` to the API. The OIDC **state** cookie is then same-site with the callback.
   - **Split deploy:** callback URL is on the **API host**, e.g. `https://<your-service>.onrender.com/api/auth/oidc/callback`.
3. **Allowed Logout URLs / Web Origins:** include your SPA origins as required by Auth0 for silent checks and development.

## Render (API) environment

| Key                                 | Notes                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_OIDC_ENABLED`                 | `true` to expose `/api/auth/oidc/login` and `/api/auth/oidc/callback`. When `false`, those routes return **404**; **`GET /api/auth/options`** still returns **`200`** with `oidc: false`.                                                                                              |
| `AUTH_OIDC_ISSUER`                  | Issuer base URL, e.g. `https://YOUR_TENANT.auth0.com/`                                                                                                                                                                                                                                 |
| `AUTH_OIDC_CLIENT_ID`               | Auth0 client ID                                                                                                                                                                                                                                                                        |
| `AUTH_OIDC_CLIENT_SECRET`           | Auth0 client secret                                                                                                                                                                                                                                                                    |
| `AUTH_OIDC_REDIRECT_URI`            | Must match Auth0 **Allowed Callback URLs** exactly                                                                                                                                                                                                                                     |
| `AUTH_FRONTEND_ORIGIN`              | **Vercel** SPA origin when frontend and API differ, e.g. `https://your-app.vercel.app`. Enables redirect to SPA with **`#oidc_token=`** fragment for Bearer handoff.                                                                                                                   |
| `AUTH_POST_LOGIN_PATH`              | Relative path on the SPA after login (default `/`).                                                                                                                                                                                                                                    |
| `AUTH_OIDC_LOGIN_STATE_TTL_SECONDS` | OIDC state cookie lifetime (default `600`).                                                                                                                                                                                                                                            |
| `SESSION_TTL_SECONDS`               | App session cookie TTL when using cookie-backed session (default `604800`).                                                                                                                                                                                                            |
| `SESSION_SECRET`                    | Min **16** characters when OIDC is enabled (else **`TOKEN_SECRET`** must be ≥16 for cookie signing). Blueprint may generate `SESSION_SECRET`.                                                                                                                                          |
| `SESSION_COOKIE_SAME_SITE`          | **`lax`** locally. For **production split deploy**, set **`none`** in the Render dashboard when **`AUTH_FRONTEND_ORIGIN`** is set (Secure cookies cross-site). **`none`** without **`AUTH_FRONTEND_ORIGIN`** in production fails validation. **`none`** in non-production is rejected. |
| `AUTH_DEMO_ENABLED`                 | Email/password **sign-in** and **guest** (`POST /api/auth/sign-in`, `POST /api/auth/guest`). Set `false` in production when OIDC is primary.                                                                                                                                           |

Also keep **`CORS_ORIGIN`** aligned with the SPA origin(s) Vercel uses.

### Split-deploy smell warning

If **`AUTH_OIDC_REDIRECT_URI`** and **`AUTH_FRONTEND_ORIGIN`** are both set but share the **same origin**, the server logs a warning at startup—often a misconfiguration for Vercel + Render (callback should usually be on the API host when using fragment handoff).

## Vercel (client)

- **`VITE_API_BASE_URL`** = Render API base URL (no trailing slash). Rebuild after changes.

The SPA calls **`GET /api/auth/options`** ( **`Cache-Control: no-store`** ) and shows **Continue with Auth0** when `oidc` is true.

## Invalid production configurations

- **`AUTH_OIDC_ENABLED=false`** and **`AUTH_DEMO_ENABLED=false`:** no HTTP path obtains an app session unless you have another mechanism—treat as intentional lockdown or misconfiguration; document for your team.

## Callback and “dead” deploy

If **`AUTH_OIDC_REDIRECT_URI`** points at an old Render hostname or wrong path, Auth0 redirects to a URL that does not hit your API—symptoms: blank page, 404 on wrong host, or Auth0 error. Fix the Auth0 **Allowed Callback URLs** and **`AUTH_OIDC_REDIRECT_URI`** together, redeploy, and retry.

## Rate limits (429)

Heavy polling or bursts against **`/api/auth/*`** can trip **`RATE_LIMIT_*`** on Render. Lower traffic during login testing, widen windows temporarily, or retry after the window.

## Local troubleshooting

- **`500` / `internal_error` or logs with `OAUTH_RESPONSE_IS_NOT_CONFORM` / “unexpected HTTP response status code”:** `openid-client` could not load OIDC discovery from **`AUTH_OIDC_ISSUER`** (the GET to **`/.well-known/openid-configuration`** returned a bad status or non‑JSON body — often **404**). Fix **`AUTH_OIDC_ISSUER`** on Render to match **Auth0 Dashboard → Applications → your app → Settings → Domain** — typically **`https://dev-xxxx.us.auth0.com/`** or **`https://YOUR_TENANT.us.auth0.com/`** (use the exact **regional** hostname Auth0 shows; `YOUR_APP.auth0.com` without the **`dev-…`** / **`us.`** segment is a frequent typo). In a browser or with curl, **`https://<that-domain>/.well-known/openid-configuration`** must return **JSON**, not HTML or 404. Align **`AUTH_OIDC_CLIENT_ID`** (and **secret** if the app is confidential) with that same application.
- **`503` / `client_error` with a long discovery hint:** same fix as above — deploy the latest API so misconfigured issuers return this message instead of **`internal_error`**.
- **`401`** after OIDC: confirm token in **`localStorage`** (`wtmini.token`), **`credentials: 'include'`** on API calls, and **`CORS_ORIGIN`** includes `http://localhost:5173`.
- **State / cookie issues:** ensure callback URL origin matches where the browser stored the OIDC state cookie (same-origin policy); use the **`localhost:5173`** callback pattern above for local dev.
