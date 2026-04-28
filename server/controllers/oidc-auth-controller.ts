/**
 * OpenID Connect: `/api/auth/options`, login redirect (PKCE), callback (code exchange + session cookie), logout.
 * `getOidcCallback` redirects to the SPA with human-readable errors instead of JSON.
 */
import { Request, Response } from 'express';
import {
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from 'openid-client';
import { z } from 'zod';
import { env } from '@server/config/env.js';
import { ClientError } from '@server/lib/client-error.js';
import { sendSuccess } from '@server/lib/http-response.js';
import { logger } from '@server/lib/logger.js';
import {
  clearAppSessionCookie,
  clearOidcLoginStateCookie,
  readOidcLoginStateCookie,
  setAppSessionCookie,
  setOidcLoginStateCookie,
} from '@server/lib/session-cookies.js';
import { signAccessToken } from '@server/services/auth-service.js';
import {
  assertOidcConfigured,
  buildOidcAuthorizationRedirect,
  exchangeOidcAuthorizationCode,
  upsertUserFromOidcProfile,
} from '@server/services/oidc-service.js';

const loginQuerySchema = z.object({
  next: z.string().optional(),
});

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

function normalizeReturnTo(nextValue: string | undefined): string | undefined {
  if (!nextValue) return undefined;
  const trimmed = nextValue.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    throw new ClientError(400, 'invalid return path');
  }
  return trimmed.slice(0, 512);
}

function postLoginRedirectBase(): string {
  const fe = env.AUTH_FRONTEND_ORIGIN.trim();
  if (fe) {
    return new URL(fe).origin;
  }
  return new URL(env.AUTH_OIDC_REDIRECT_URI).origin;
}

function redirectWithAuthError(res: Response, message: string): void {
  const path = `/sign-in?auth_error=${encodeURIComponent(message)}`;
  res.redirect(302, `${postLoginRedirectBase()}${path}`);
}

/** GET /api/auth/options — public; drives client sign-in UI. */
export function getAuthOptions(_req: Request, res: Response): void {
  sendSuccess(res, {
    oidc: env.AUTH_OIDC_ENABLED,
    demo: env.AUTH_DEMO_ENABLED,
  });
}

/** GET /api/auth/oidc/login */
export async function getOidcLogin(req: Request, res: Response): Promise<void> {
  assertOidcConfigured();
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
}

/** GET /api/auth/oidc/callback */
export async function getOidcCallback(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    assertOidcConfigured();

    if (typeof req.query.error === 'string') {
      clearOidcLoginStateCookie(res);
      redirectWithAuthError(
        res,
        'sign-in was cancelled or rejected by the identity provider',
      );
      return;
    }

    const query = callbackQuerySchema.parse(req.query);
    const loginState = readOidcLoginStateCookie(req);
    if (!loginState) {
      redirectWithAuthError(
        res,
        'sign-in session expired; please start sign-in again',
      );
      return;
    }
    if (query.state !== loginState.state) {
      clearOidcLoginStateCookie(res);
      redirectWithAuthError(res, 'invalid sign-in state');
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
    /**
     * Split deploy (e.g. Vercel + Render): third-party cookie rules can prevent the API `wt_session`
     * cookie from being included on cross-origin fetches. Hand off a Bearer JWT in the URL fragment
     * so the SPA can store it and use Authorization header for API requests.
     */
    if (env.AUTH_FRONTEND_ORIGIN.trim()) {
      url.hash = `oidc_token=${encodeURIComponent(signAccessToken(userId))}`;
    }
    res.redirect(302, url.toString());
  } catch (err) {
    clearOidcLoginStateCookie(res);
    if (err instanceof z.ZodError) {
      redirectWithAuthError(res, 'invalid callback from identity provider');
      return;
    }
    if (err instanceof ClientError) {
      redirectWithAuthError(res, err.message);
      return;
    }
    logger.error({ err }, 'oidc callback failed');
    redirectWithAuthError(res, 'could not complete sign-in');
  }
}

/** POST /api/auth/logout — clears OIDC session cookie (and client clears JWT). */
export function postAuthLogout(_req: Request, res: Response): void {
  clearAppSessionCookie(res);
  clearOidcLoginStateCookie(res);
  sendSuccess(res, { ok: true });
}
