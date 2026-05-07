import { describe, expect, it, vi } from 'vitest';

vi.mock('@server/config/env.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@server/config/env.js')>();
  return {
    ...mod,
    env: {
      ...mod.env,
      AUTH_OIDC_ENABLED: true,
      AUTH_OIDC_ISSUER: 'https://issuer.example/',
      AUTH_OIDC_CLIENT_ID: 'client-id',
      AUTH_OIDC_REDIRECT_URI: 'http://localhost:5173/api/auth/oidc/callback',
    },
  };
});

vi.mock('openid-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('openid-client')>();
  return {
    ...actual,
    discovery: vi.fn(async (): Promise<unknown> => ({ mockIssuer: true })),
    authorizationCodeGrant: vi.fn(
      async (): Promise<{
        claims: () => {
          sub: string;
          name: string;
          email: string;
        };
      }> => ({
        claims: (): {
          sub: string;
          name: string;
          email: string;
        } => ({
          sub: 'provider-sub-99',
          name: '  Trim Name  ',
          email: '  trim@mail.dev  ',
        }),
      }),
    ),
  };
});

describe('oidc-service', () => {
  it('buildOidcCallbackUrl uses AUTH_OIDC_REDIRECT_URI origin and passes query string', async () => {
    const { buildOidcCallbackUrl } = await import('./oidc-service.js');
    const url = buildOidcCallbackUrl({
      originalUrl: '/api/auth/oidc/callback?code=c1&state=s1',
    });
    expect(url.origin).toBe('http://localhost:5173');
    expect(url.pathname).toBe('/api/auth/oidc/callback');
    expect(url.searchParams.get('code')).toBe('c1');
    expect(url.searchParams.get('state')).toBe('s1');
  });

  it('exchangeOidcAuthorizationCode maps id token claims', async () => {
    const {
      exchangeOidcAuthorizationCode,
      resetOidcConfigurationCacheForTests,
    } = await import('./oidc-service.js');
    resetOidcConfigurationCacheForTests();

    const profile = await exchangeOidcAuthorizationCode(
      { originalUrl: '/api/auth/oidc/callback?code=x&state=y' },
      {
        expectedState: 'y',
        expectedNonce: 'n',
        pkceCodeVerifier: 'v'.repeat(64),
      },
    );

    expect(profile).toEqual({
      sub: 'provider-sub-99',
      displayName: 'Trim Name',
      email: 'trim@mail.dev',
    });
  });
});
