import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '@server/config/env.js';
import { sendError, sendSuccess } from '@server/lib/http-response.js';
import { requireUserId } from '@server/lib/request-user.js';
import {
  createGuestSession,
  readMe,
  signInUser,
  updateMyPreferences,
} from '@server/services/auth-service.js';

/** Request schema for credential sign-in. */
const signInBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const uiTextSizePreference = z.union([
  z.literal('standard'),
  z.literal('medium'),
  z.literal('large'),
  z.literal('xl'),
  z.literal('normal'),
]);

const patchPreferencesBody = z.object({
  uiHighContrast: z.boolean().optional(),
  uiTextSize: uiTextSizePreference.optional(),
});

/** Create a guest account and return a JWT-backed session payload. */
export async function postAuthGuest(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!env.AUTH_DEMO_ENABLED) {
      sendError(res, 403, {
        code: 'client_error',
        message: 'demo authentication is disabled',
      });
      return;
    }
    const result = await createGuestSession();
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

/** Sign in an existing user via email/password and return session token. */
export async function postAuthSignIn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!env.AUTH_DEMO_ENABLED) {
      sendError(res, 403, {
        code: 'client_error',
        message: 'demo authentication is disabled',
      });
      return;
    }
    const body = signInBody.parse(req.body);
    const result = await signInUser(body.email, body.password);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/** Return the authenticated user's profile and preference payload. */
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const me = await readMe(requireUserId(req));
    sendSuccess(res, me);
  } catch (err) {
    next(err);
  }
}

/** Update preference fields for the authenticated user. */
export async function patchMePreferences(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = patchPreferencesBody.parse(req.body);
    const user = await updateMyPreferences(requireUserId(req), body);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
