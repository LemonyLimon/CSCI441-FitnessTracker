/** Must match localStorage key used for Bearer JWT (guest / demo / OIDC fragment). */
export const TOKEN_STORAGE_KEY = 'wtmini.token';

/**
 * OIDC split-deploy: API redirects to the SPA with `#oidc_token=…` so the client can
 * authenticate without relying on cross-site cookies.
 */
export function bootstrapOidcFragment(): void {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw.startsWith('oidc_token=')) return;
  const params = new URLSearchParams(raw);
  const t = params.get('oidc_token');
  if (!t) return;
  localStorage.setItem(TOKEN_STORAGE_KEY, t);
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}`,
  );
}
