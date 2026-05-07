import * as oidc from 'openid-client';
import { eq } from 'drizzle-orm';
import { env } from '@server/config/env.js';
import { DbClient, getDrizzleDb } from '@server/db/drizzle.js';
import { users } from '@server/db/schema.js';
import { ClientError } from '@server/lib/client-error.js';
import { logger } from '@server/lib/logger.js';
import { isPgUniqueViolation } from '@server/lib/pg-errors.js';

let oidcConfigPromise: Promise<oidc.Configuration> | null = null;

/** Clears cached IdP discovery (Vitest only). */
export function resetOidcConfigurationCacheForTests(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetOidcConfigurationCacheForTests is test-only');
  }
  oidcConfigPromise = null;
}

/** Map `openid-client` failures to an API-safe message (never log tokens). */
export function formatOpenIdClientFailure(
  err: InstanceType<typeof oidc.ClientError>,
): string {
  if (err.code === 'OAUTH_RESPONSE_IS_NOT_CONFORM') {
    return (
      'OIDC discovery failed: the issuer URL did not return a valid OpenID document. ' +
      'Set AUTH_OIDC_ISSUER to your Auth0 Domain from Dashboard → Applications → [your app] → Settings ' +
      '(for example https://dev-xxxx.us.auth0.com/ — use the exact regional domain Auth0 shows). ' +
      'Confirm in a browser that https://<domain>/.well-known/openid-configuration returns JSON.'
    );
  }
  return `Identity provider error: ${err.message}`;
}

function requireDb(): DbClient {
  const db = getDrizzleDb();
  if (!db) {
    throw new ClientError(
      503,
      'database is not configured. set DATABASE_URL and run migrations.',
    );
  }
  return db;
}

export function assertOidcConfigured(): void {
  if (!env.AUTH_OIDC_ENABLED) {
    throw new ClientError(503, 'OpenID Connect login is not configured');
  }
}

export async function getOidcConfiguration(): Promise<oidc.Configuration> {
  assertOidcConfigured();
  if (!oidcConfigPromise) {
    const issuer = new URL(env.AUTH_OIDC_ISSUER);
    const hasSecret = Boolean(env.AUTH_OIDC_CLIENT_SECRET.trim());
    const clientAuth = hasSecret
      ? oidc.ClientSecretPost(env.AUTH_OIDC_CLIENT_SECRET)
      : oidc.None();
    const metadata = hasSecret
      ? { token_endpoint_auth_method: 'client_secret_post' as const }
      : { token_endpoint_auth_method: 'none' as const };
    oidcConfigPromise = oidc
      .discovery(issuer, env.AUTH_OIDC_CLIENT_ID, metadata, clientAuth)
      .catch((err: unknown) => {
        oidcConfigPromise = null;
        throw err;
      });
  }
  return oidcConfigPromise;
}

export async function buildOidcAuthorizationRedirect(
  state: string,
  nonce: string,
  codeVerifier: string,
): Promise<string> {
  try {
    const config = await getOidcConfiguration();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: env.AUTH_OIDC_REDIRECT_URI,
      scope: 'openid profile email',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return redirectTo.toString();
  } catch (err) {
    if (err instanceof ClientError) throw err;
    if (err instanceof oidc.ClientError) {
      logger.error(
        { err, code: err.code },
        'OIDC: IdP discovery or authorize URL failed',
      );
      throw new ClientError(503, formatOpenIdClientFailure(err));
    }
    logger.error(
      { err },
      'OIDC: authorization redirect failed (discovery, PKCE, or authorize URL)',
    );
    throw new ClientError(
      503,
      'Could not start sign-in with the identity provider. Verify AUTH_OIDC_ISSUER matches your Auth0 tenant (Applications → your app → Settings → Domain) and that AUTH_OIDC_CLIENT_ID / AUTH_OIDC_CLIENT_SECRET match the same application.',
    );
  }
}

/** Build callback URL for token exchange; must match AUTH_OIDC_REDIRECT_URI origin/path. */
export function buildOidcCallbackUrl(req: { originalUrl: string }): URL {
  const configured = new URL(env.AUTH_OIDC_REDIRECT_URI);
  const q = req.originalUrl.indexOf('?');
  const query = q >= 0 ? req.originalUrl.slice(q) : '';
  return new URL(`${configured.pathname}${query}`, configured.origin);
}

export async function exchangeOidcAuthorizationCode(
  req: { originalUrl: string },
  checks: {
    expectedState: string;
    expectedNonce: string;
    pkceCodeVerifier: string;
  },
): Promise<{ sub: string; displayName: string | null; email: string | null }> {
  const config = await getOidcConfiguration();
  const callbackUrl = buildOidcCallbackUrl(req);
  const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
    expectedState: checks.expectedState,
    expectedNonce: checks.expectedNonce,
    pkceCodeVerifier: checks.pkceCodeVerifier,
  });
  const claims = tokens.claims();
  const sub = claims?.sub;
  if (!sub) {
    throw new ClientError(401, 'id token subject is missing');
  }
  const name =
    typeof claims?.name === 'string' ? claims.name.trim() || null : null;
  const email =
    typeof claims?.email === 'string' ? claims.email.trim() || null : null;
  return { sub, displayName: name, email };
}

function defaultDisplayName(
  displayName: string | null,
  email: string | null,
  sub: string,
): string {
  if (displayName) return displayName.slice(0, 120);
  if (email) {
    const local = email.split('@')[0]?.trim();
    if (local) return local.slice(0, 120);
  }
  return `User ${sub.slice(0, 24)}`;
}

/**
 * Find or create user with authSubject = OIDC sub (IdP-unique). Does not auto-link by email.
 */
export async function upsertUserFromOidcProfile(input: {
  sub: string;
  displayName: string | null;
  email: string | null;
}): Promise<number> {
  const db = requireDb();
  const [existing] = await db
    .select({ userId: users.userId })
    .from(users)
    .where(eq(users.authSubject, input.sub))
    .limit(1);
  if (existing) return existing.userId;

  const displayName = defaultDisplayName(
    input.displayName,
    input.email,
    input.sub,
  );

  try {
    const [created] = await db
      .insert(users)
      .values({
        authSubject: input.sub,
        displayName,
        isGuest: false,
      })
      .returning({ userId: users.userId });
    if (!created) throw new ClientError(500, 'failed to create user');
    return created.userId;
  } catch (err) {
    if (isPgUniqueViolation(err, 'users_authSubject_unique')) {
      const [concurrent] = await db
        .select({ userId: users.userId })
        .from(users)
        .where(eq(users.authSubject, input.sub))
        .limit(1);
      if (concurrent) {
        logger.info(
          'concurrent OIDC signup lost insert race; using existing user row',
        );
        return concurrent.userId;
      }
    }
    throw err;
  }
}
