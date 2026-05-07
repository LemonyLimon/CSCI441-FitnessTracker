/** Short-lived values stored before redirecting to the IdP (signed cookie). */
export type OidcLoginStateCookie = {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo?: string;
};

/** Long-lived session after successful OIDC callback. */
export type AppSessionCookie = {
  sid: string;
  userId: number;
};
