import { afterEach, describe, expect, it } from 'vitest';
import { TOKEN_STORAGE_KEY, bootstrapOidcFragment } from '@/lib/oidc-fragment';

describe('bootstrapOidcFragment', () => {
  afterEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('stores token and strips hash', () => {
    const tk = encodeURIComponent('jwt-here');
    window.history.pushState(null, '', `/#oidc_token=${tk}`);
    bootstrapOidcFragment();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('jwt-here');
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/');
  });

  it('no-ops when hash is absent', () => {
    window.history.pushState(null, '', '/foo');
    bootstrapOidcFragment();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
