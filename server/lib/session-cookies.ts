import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { cookieSigningSecret, env } from '@server/config/env.js';
import type { AppSessionCookie, OidcLoginStateCookie } from './auth-types.js';

const sessionCookieName = 'wt_session';
const loginStateCookieName = 'wt_oidc_login';

function readCookies(req: Request): Record<string, string> {
  const rawCookie = req.get('cookie');
  if (!rawCookie) return {};
  return rawCookie.split(';').reduce<Record<string, string>>((acc, pair) => {
    const [keyPart, ...valueParts] = pair.trim().split('=');
    if (!keyPart) return acc;
    acc[keyPart] = decodeURIComponent(valueParts.join('='));
    return acc;
  }, {});
}

function cookieBase(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: '/';
} {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.SESSION_COOKIE_SAME_SITE,
    path: '/',
  };
}

export function setOidcLoginStateCookie(
  res: Response,
  payload: OidcLoginStateCookie,
): void {
  const token = jwt.sign(payload, cookieSigningSecret(), {
    expiresIn: env.AUTH_OIDC_LOGIN_STATE_TTL_SECONDS,
  });
  res.cookie(loginStateCookieName, token, {
    ...cookieBase(),
    maxAge: env.AUTH_OIDC_LOGIN_STATE_TTL_SECONDS * 1000,
  });
}

export function readOidcLoginStateCookie(
  req: Request,
): OidcLoginStateCookie | null {
  const token = readCookies(req)[loginStateCookieName];
  if (!token) return null;
  try {
    return jwt.verify(token, cookieSigningSecret()) as OidcLoginStateCookie;
  } catch {
    return null;
  }
}

export function clearOidcLoginStateCookie(res: Response): void {
  res.clearCookie(loginStateCookieName, { ...cookieBase() });
}

export function setAppSessionCookie(res: Response, userId: number): void {
  const payload: AppSessionCookie = {
    sid: randomUUID(),
    userId,
  };
  const token = jwt.sign(payload, cookieSigningSecret(), {
    expiresIn: env.SESSION_TTL_SECONDS,
  });
  res.cookie(sessionCookieName, token, {
    ...cookieBase(),
    maxAge: env.SESSION_TTL_SECONDS * 1000,
  });
}

export function readAppSessionCookie(req: Request): AppSessionCookie | null {
  const token = readCookies(req)[sessionCookieName];
  if (!token) return null;
  try {
    return jwt.verify(token, cookieSigningSecret()) as AppSessionCookie;
  } catch {
    return null;
  }
}

export function clearAppSessionCookie(res: Response): void {
  res.clearCookie(sessionCookieName, { ...cookieBase() });
}
