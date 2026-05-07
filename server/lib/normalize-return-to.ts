import { ClientError } from '@server/lib/client-error.js';

/**
 * Accept only same-origin relative paths for post-login redirect (`next` query).
 * Allows query strings (e.g. `/path?q=1`); rejects open redirects and schemes.
 */
export function normalizeReturnTo(
  nextValue: string | undefined,
): string | undefined {
  if (!nextValue) return undefined;
  const trimmed = nextValue.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    throw new ClientError(400, 'invalid return path');
  }
  if (trimmed.includes('#')) {
    throw new ClientError(400, 'invalid return path');
  }
  return trimmed.slice(0, 512);
}
