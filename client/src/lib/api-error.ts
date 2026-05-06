import { type ApiErrorEnvelope } from '@shared/api-contracts';

function formatValidationDetails(details: unknown): string | null {
  if (!Array.isArray(details) || details.length === 0) return null;
  const first = details[0] as {
    path?: unknown;
    message?: unknown;
  };
  const path =
    Array.isArray(first.path) && first.path.length > 0
      ? String(first.path.join('.'))
      : null;
  const msg = typeof first.message === 'string' ? first.message : null;
  if (!path && !msg) return null;
  if (path && msg) return `${path}: ${msg}`;
  return msg ?? path;
}

/**
 * Build a user-facing message from API error envelope payload.
 */
export function getApiErrorMessage(
  responseStatus: number,
  errorEnvelope: ApiErrorEnvelope | null,
): string {
  const errorCode = errorEnvelope?.error?.code;
  const errorMessage = errorEnvelope?.error?.message;
  const requestId = errorEnvelope?.meta?.requestId;

  const validationHint =
    errorCode === 'validation_error'
      ? formatValidationDetails(errorEnvelope?.error?.details)
      : null;

  const baseMessage =
    errorMessage ??
    (errorCode === 'validation_error'
      ? 'Please check your input and try again.'
      : errorCode === 'invalid_token'
        ? 'Your session is invalid. Please sign in again.'
        : errorCode === 'internal_error'
          ? 'Server error. Please try again in a moment.'
          : `Request failed: ${responseStatus}`);

  const withValidation =
    validationHint && errorCode === 'validation_error'
      ? `${baseMessage} ${validationHint}`
      : baseMessage;

  return requestId
    ? `${withValidation} (request: ${requestId})`
    : withValidation;
}
