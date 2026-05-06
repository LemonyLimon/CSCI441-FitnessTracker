const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';

/**
 * Optional absolute API base URL for split frontend/backend hosting.
 * Example: https://your-api-service.onrender.com
 */
const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');

/**
 * Resolve API request input against optional hosted API origin.
 */
export function resolveApiInput(input: RequestInfo): RequestInfo {
  if (!apiBaseUrl || typeof input !== 'string' || !input.startsWith('/')) {
    return input;
  }
  return `${apiBaseUrl}${input}`;
}
