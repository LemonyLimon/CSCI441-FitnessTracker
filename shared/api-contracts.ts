export type ApiErrorCode =
  | 'client_error'
  | 'validation_error'
  | 'invalid_token'
  | 'internal_error';

export type ApiMeta = {
  requestId?: string;
};

export type ApiSuccessEnvelope<T> = {
  data: T;
  meta?: ApiMeta;
};

/** GET /api/auth/options — which auth flows the SPA should expose. */
export type AuthOptionsResponse = {
  oidc: boolean;
  demo: boolean;
};

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ApiErrorEnvelope = {
  error: ApiErrorBody;
  meta?: ApiMeta;
};
