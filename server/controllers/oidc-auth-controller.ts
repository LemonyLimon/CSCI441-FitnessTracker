/**
 * OIDC: `/api/auth/options`, `/api/auth/oidc/login`, `/api/auth/oidc/callback`, `/api/auth/logout`.
 * **`getOidcCallback`** is not passed through `next(err)` for redirect paths — it handles errors via SPA redirect.
 */
import { NextFunction, Request, Response } from 'express';
import {
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from 'openid-client';
import { z } from 'zod';
import type { AuthOptionsResponse } from '@shared/api-contracts';
import { env } from '@server/config/env.js';
import { ClientError } from '@server/lib/client-error.js';
import { sendError, sendSuccess } from '@server/lib/http-response.js';
import { logger } from '@server/lib/logger.js';
import { normalizeReturnTo } from '@server/lib/normalize-return-to.js';
import {
  clearAppSessionCookie,
  clearOidcLoginStateCookie,
  readOidcLoginStateCookie,
  setAppSessionCookie,
  setOidcLoginStateCookie,
} from '@server/lib/session-cookies.js';
import { signAccessToken } from '@server/services/auth-service.js';
import {
  buildOidcAuthorizationRedirect,
  exchangeOidcAuthorizationCode,
  upsertUserFromOidcProfile,
} from '@server/services/oidc-service.js';

export type OidcAuthErrorCode =
  | 'state_mismatch'
  | 'idp_error'
  | 'state_expired'
  | 'internal';

const loginQuerySchema = z.object({
  next: z.string().optional(),
});

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

function postLoginRedirectBase(): string {
  const fe = env.AUTH_FRONTEND_ORIGIN.trim();
  if (fe) {
    return new URL(fe).origin;
  }
  return new URL(env.AUTH_OIDC_REDIRECT_URI).origin;
}

function redirectWithOidcAuthError(
  res: Response,
  code: OidcAuthErrorCode,
): void {
  const url = new URL(env.AUTH_POST_LOGIN_PATH, postLoginRedirectBase());
  url.searchParams.set('auth_error', code);
  res.redirect(302, url.toString());
}

/** GET /api/auth/options — public; drives client sign-in UI. Not cached. */
export function getAuthOptions(_req: Request, res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  const payload: AuthOptionsResponse = {
    oidc: env.AUTH_OIDC_ENABLED,
    demo: env.AUTH_DEMO_ENABLED,
  };
  sendSuccess(res, payload);
}

/** GET /api/auth/oidc/login */
export async function getOidcLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!env.AUTH_OIDC_ENABLED) {
      sendError(res, 404, {
        code: 'client_error',
        message: 'OpenID Connect login is not enabled',
      });
      return;
    }

    const q = loginQuerySchema.parse(req.query);
    const returnTo = normalizeReturnTo(q.next);
    const state = randomState();
    const nonce = randomNonce();
    const codeVerifier = randomPKCECodeVerifier();
    const redirectUrl = await buildOidcAuthorizationRedirect(
      state,
      nonce,
      codeVerifier,
    );
    setOidcLoginStateCookie(res, {
      state,
      nonce,
      codeVerifier,
      returnTo,
    });
    res.redirect(302, redirectUrl);
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/oidc/callback */
export async function getOidcCallback(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!env.AUTH_OIDC_ENABLED) {
      sendError(res, 404, {
        code: 'client_error',
        message: 'OpenID Connect login is not enabled',
      });
      return;
    }

    if (typeof req.query.error === 'string') {
      clearOidcLoginStateCookie(res);
      redirectWithOidcAuthError(res, 'idp_error');
      return;
    }

    const query = callbackQuerySchema.parse(req.query);
    const loginState = readOidcLoginStateCookie(req);
    if (!loginState) {
      redirectWithOidcAuthError(res, 'state_expired');
      return;
    }
    if (query.state !== loginState.state) {
      clearOidcLoginStateCookie(res);
      redirectWithOidcAuthError(res, 'state_mismatch');
      return;
    }

    const profile = await exchangeOidcAuthorizationCode(req, {
      expectedState: loginState.state,
      expectedNonce: loginState.nonce,
      pkceCodeVerifier: loginState.codeVerifier,
    });
    const userId = await upsertUserFromOidcProfile(profile);
    setAppSessionCookie(res, userId);
    clearOidcLoginStateCookie(res);

    const base = postLoginRedirectBase();
    const path = loginState.returnTo ?? env.AUTH_POST_LOGIN_PATH;
    const url = new URL(path, base);

    if (env.AUTH_FRONTEND_ORIGIN.trim()) {
      url.hash = `oidc_token=${encodeURIComponent(signAccessToken(userId))}`;
    }
    res.redirect(302, url.toString());
  } catch (err) {
    clearOidcLoginStateCookie(res);
    if (err instanceof z.ZodError) {
      redirectWithOidcAuthError(res, 'idp_error');
      return;
    }
    if (err instanceof ClientError) {
      redirectWithOidcAuthError(res, 'internal');
      return;
    }
    logger.error(
      { message: err instanceof Error ? err.message : String(err) },
      'oidc callback failed',
    );
    redirectWithOidcAuthError(res, 'internal');
  }
}

/** POST /api/auth/logout — clears OIDC session cookies (client clears Bearer). */
export function postLogout(_req: Request, res: Response): void {
  clearAppSessionCookie(res);
  clearOidcLoginStateCookie(res);
  sendSuccess(res, { ok: true });
}
