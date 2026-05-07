import request from 'supertest';
import type { Express } from 'express';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@server/config/env.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@server/config/env.js')>();
  return {
    ...mod,
    env: {
      ...mod.env,
      AUTH_OIDC_ENABLED: true,
      AUTH_OIDC_ISSUER: 'https://tenant.auth0.com/',
      AUTH_OIDC_CLIENT_ID: 'test-client-id',
      AUTH_OIDC_REDIRECT_URI: 'http://127.0.0.1:5173/api/auth/oidc/callback',
      AUTH_FRONTEND_ORIGIN: '',
      AUTH_POST_LOGIN_PATH: '/',
    },
  };
});

vi.mock('openid-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('openid-client')>();
  return {
    ...actual,
    randomState: (): string => 'fixed-oauth-state',
    randomNonce: (): string => 'fixed-nonce',
    randomPKCECodeVerifier: (): string => 'b'.repeat(64),
  };
});

vi.mock('@server/services/oidc-service.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@server/services/oidc-service.js')>();
  return {
    ...actual,
    buildOidcAuthorizationRedirect: vi.fn(() =>
      Promise.resolve('https://mock-idp.example/oauth2/authorize'),
    ),
    exchangeOidcAuthorizationCode: vi.fn(() =>
      Promise.resolve({
        sub: 'auth0|integration-sub',
        displayName: 'Integration User',
        email: 'integration@test.dev',
      }),
    ),
    upsertUserFromOidcProfile: vi.fn(() => Promise.resolve(501)),
  };
});

function cookiePairHeader(setCookie: string | string[] | undefined): string {
  if (!setCookie) return '';
  const parts = Array.isArray(setCookie) ? setCookie : [setCookie];
  return parts
    .map((c) => c.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

describe('OIDC login → callback (mocked IdP)', () => {
  let app: Express;

  beforeAll(async () => {
    process.env.TOKEN_SECRET =
      process.env.TOKEN_SECRET ?? 'test-token-secret-16b';
    const { createApp } = await import('@server/app.js');
    app = createApp();
  });

  it('redirects to IdP from login, then completes callback with session redirect', async () => {
    const loginRes = await request(app)
      .get('/api/auth/oidc/login')
      .query({ next: '/' })
      .expect(302);

    expect(loginRes.headers.location).toContain('mock-idp.example');

    const cookieHeader = cookiePairHeader(loginRes.headers['set-cookie']);
    expect(cookieHeader.length).toBeGreaterThan(0);

    const cb = await request(app)
      .get('/api/auth/oidc/callback')
      .query({ code: 'mock-auth-code', state: 'fixed-oauth-state' })
      .set('Cookie', cookieHeader)
      .expect(302);

    expect(cb.headers.location).toMatch(/^http:\/\/127\.0\.0\.1:5173\/?(\?|$)/);
    const setCookie = cb.headers['set-cookie'];
    const sessionCookies = Array.isArray(setCookie)
      ? setCookie
      : [setCookie ?? ''];
    expect(sessionCookies.some((c) => c.includes('ftrack_session'))).toBe(true);
  });
});
