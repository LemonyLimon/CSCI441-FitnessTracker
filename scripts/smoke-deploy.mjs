#!/usr/bin/env node
/**
 * Post-deploy smoke checks for the **API** (e.g. Render web service).
 *
 * Usage:
 *   DEPLOY_URL=https://your-service.onrender.com pnpm run smoke:deploy
 *
 * Use the **API base URL** (same host as `/api/*`), not the Vercel SPA URL.
 * No credentials required — only public endpoints and unauthenticated 401s.
 */

const deployUrl = process.env.DEPLOY_URL;

if (!deployUrl) {
  console.error(
    'DEPLOY_URL is required, for example: DEPLOY_URL=https://your-api.onrender.com',
  );
  process.exit(1);
}

const base = deployUrl.replace(/\/+$/, '');

function ensureOk(response, label) {
  if (!response.ok) {
    throw new Error(
      `${label} failed with ${response.status} ${response.statusText}`,
    );
  }
}

async function getJson(path, label) {
  const response = await fetch(`${base}${path}`, {
    headers: { Accept: 'application/json' },
  });
  ensureOk(response, label);
  return response.json();
}

async function run() {
  console.log(`Smoke testing fitness-tracker API at ${base}`);

  const health = await getJson('/api/health', 'GET /api/health');
  if (!health?.data) {
    throw new Error('GET /api/health returned unexpected payload (missing data)');
  }
  console.log('PASS GET /api/health');

  const optsRes = await fetch(`${base}/api/auth/options`, {
    headers: { Accept: 'application/json' },
  });
  ensureOk(optsRes, 'GET /api/auth/options');
  const optsContentType = optsRes.headers.get('content-type') ?? '';
  if (!/application\/json/i.test(optsContentType)) {
    throw new Error(
      `GET /api/auth/options returned "${optsContentType}" (expected application/json). ` +
        `If you see text/html, the server is serving the SPA shell—deploy may be missing ` +
        `GET /api/auth/options (merge OIDC changes and redeploy the API).`,
    );
  }
  const cacheControl = optsRes.headers.get('cache-control') ?? '';
  if (!/no-store/i.test(cacheControl)) {
    throw new Error(
      `Expected Cache-Control: no-store on /api/auth/options, got "${cacheControl}"`,
    );
  }
  const optsJson = await optsRes.json();
  if (
    typeof optsJson?.data?.oidc !== 'boolean' ||
    typeof optsJson?.data?.demo !== 'boolean'
  ) {
    throw new Error(
      'GET /api/auth/options: expected envelope data.oidc and data.demo booleans',
    );
  }
  console.log(
    `PASS GET /api/auth/options (oidc=${optsJson.data.oidc}, demo=${optsJson.data.demo})`,
  );

  const workoutsUnauth = await fetch(`${base}/api/workouts`, {
    headers: { Accept: 'application/json' },
  });
  if (workoutsUnauth.status !== 401) {
    throw new Error(
      `GET /api/workouts without auth expected 401, got ${workoutsUnauth.status}`,
    );
  }
  console.log('PASS GET /api/workouts (401 without auth)');

  const meUnauth = await fetch(`${base}/api/me`, {
    headers: { Accept: 'application/json' },
  });
  if (meUnauth.status !== 401) {
    throw new Error(
      `GET /api/me without auth expected 401, got ${meUnauth.status}`,
    );
  }
  console.log('PASS GET /api/me (401 without auth)');

  console.log('Smoke test completed successfully.');
}

run().catch((error) => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exit(1);
});
