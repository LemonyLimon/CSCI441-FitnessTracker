export type OidcLoginStateCookie = {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo?: string;
};

export type AppSessionCookie = {
  sid: string;
  userId: number;
};
