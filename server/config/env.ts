import 'dotenv/config';
import { z } from 'zod';

function parseBooleanEnv(defaultValue: boolean): z.ZodType<boolean> {
  return z.preprocess((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['1', 'true', 't', 'yes', 'y', 'on'].includes(normalized)) {
        return true;
      }
      if (['0', 'false', 'f', 'no', 'n', 'off', ''].includes(normalized)) {
        return false;
      }
    }
    if (value == null) return defaultValue;
    return value;
  }, z.boolean().default(defaultValue));
}

const sessionSameSiteSchema = z.enum(['lax', 'strict', 'none']);

/** Strip accidental newlines/spaces from dashboard paste (Auth0 rejects redirect_uri with stray newline). */
function trimOidcEnvStrings(envObj: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const keys = [
    'AUTH_OIDC_ISSUER',
    'AUTH_OIDC_CLIENT_ID',
    'AUTH_OIDC_CLIENT_SECRET',
    'AUTH_OIDC_REDIRECT_URI',
    'AUTH_FRONTEND_ORIGIN',
    'SESSION_SECRET',
  ] as const;
  const out: NodeJS.ProcessEnv = { ...envObj };
  for (const k of keys) {
    const v = out[k];
    if (typeof v === 'string') {
      out[k] = v.trim();
    }
  }
  return out;
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  RATE_LIMIT_WRITE_MAX: z.coerce.number().int().positive().default(60),
  DATABASE_URL: z.string().optional().default(''),
  DATABASE_SSL: z.enum(['auto', 'true', 'false']).default('auto'),
  TOKEN_SECRET: z.string().min(1, 'TOKEN_SECRET is required'),
  /** Demo email/password sign-in and guest. Disable in production when OIDC is primary. */
  AUTH_DEMO_ENABLED: parseBooleanEnv(true),
  AUTH_OIDC_ENABLED: parseBooleanEnv(false),
  AUTH_OIDC_ISSUER: z.string().optional().default(''),
  AUTH_OIDC_CLIENT_ID: z.string().optional().default(''),
  AUTH_OIDC_CLIENT_SECRET: z.string().optional().default(''),
  AUTH_OIDC_REDIRECT_URI: z.string().optional().default(''),
  AUTH_FRONTEND_ORIGIN: z.string().optional().default(''),
  AUTH_POST_LOGIN_PATH: z.string().default('/'),
  SESSION_SECRET: z.string().optional().default(''),
  AUTH_OIDC_LOGIN_STATE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3600)
    .default(600),
  SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .max(2592000)
    .default(604800),
  SESSION_COOKIE_SAME_SITE: sessionSameSiteSchema.default('lax'),
});

function formatEnvIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ');
}

const parsed = envSchema.safeParse(trimOidcEnvStrings(process.env));
if (!parsed.success) {
  const formatted = formatEnvIssues(parsed.error.issues);
  throw new Error(`Invalid environment configuration: ${formatted}`);
}

const data = parsed.data;

if (data.AUTH_OIDC_ENABLED && data.NODE_ENV !== 'test') {
  const missing: string[] = [];
  if (!data.AUTH_OIDC_ISSUER.trim()) missing.push('AUTH_OIDC_ISSUER');
  if (!data.AUTH_OIDC_CLIENT_ID.trim()) missing.push('AUTH_OIDC_CLIENT_ID');
  if (!data.AUTH_OIDC_REDIRECT_URI.trim())
    missing.push('AUTH_OIDC_REDIRECT_URI');
  if (missing.length > 0) {
    throw new Error(`AUTH_OIDC_ENABLED requires: ${missing.join(', ')}`);
  }
  const effectiveSecret =
    data.SESSION_SECRET.trim().length >= 16
      ? data.SESSION_SECRET.trim()
      : data.TOKEN_SECRET;
  if (effectiveSecret.length < 16) {
    throw new Error(
      'AUTH_OIDC_ENABLED requires SESSION_SECRET (min 16 chars) or TOKEN_SECRET at least 16 chars for cookie signing',
    );
  }
  const validateUrl = (label: string, value: string): void => {
    try {
      // eslint-disable-next-line no-new -- intentional validation side effect
      new URL(value);
    } catch {
      throw new Error(`${label} must be a valid absolute URL`);
    }
  };
  validateUrl('AUTH_OIDC_ISSUER', data.AUTH_OIDC_ISSUER);
  validateUrl('AUTH_OIDC_REDIRECT_URI', data.AUTH_OIDC_REDIRECT_URI);
  const fe = data.AUTH_FRONTEND_ORIGIN.trim();
  if (fe) {
    validateUrl('AUTH_FRONTEND_ORIGIN', fe);
  }
  if (
    data.AUTH_POST_LOGIN_PATH &&
    (!data.AUTH_POST_LOGIN_PATH.startsWith('/') ||
      data.AUTH_POST_LOGIN_PATH.startsWith('//'))
  ) {
    throw new Error(
      'AUTH_POST_LOGIN_PATH must be a relative path starting with /',
    );
  }
}

if (data.NODE_ENV === 'production') {
  const fe = data.AUTH_FRONTEND_ORIGIN.trim();
  if (fe) {
    if (data.SESSION_COOKIE_SAME_SITE !== 'none') {
      throw new Error(
        'In production, SESSION_COOKIE_SAME_SITE must be "none" when AUTH_FRONTEND_ORIGIN is set (split SPA + API origins).',
      );
    }
  }
  if (data.SESSION_COOKIE_SAME_SITE === 'none' && !fe) {
    throw new Error(
      'In production, AUTH_FRONTEND_ORIGIN is required when SESSION_COOKIE_SAME_SITE is "none".',
    );
  }
} else if (data.SESSION_COOKIE_SAME_SITE === 'none') {
  throw new Error(
    'SESSION_COOKIE_SAME_SITE=none is only valid when NODE_ENV=production (Secure + localhost mismatch otherwise).',
  );
}

/** Secret for OIDC state + app session cookies (falls back to TOKEN_SECRET). */
export function cookieSigningSecret(): string {
  const s = data.SESSION_SECRET.trim();
  if (s.length >= 16) return s;
  return data.TOKEN_SECRET;
}

/** Validated, typed runtime environment values. */
export const env = data;
