import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@server/config/env.js';
import { ClientError } from './client-error.js';
import { readAppSessionCookie } from './session-cookies.js';

const secret = env.TOKEN_SECRET;

/**
 * Accept Bearer JWT (demo / guest) or signed session cookie (OIDC).
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authorization = req.get('authorization') ?? '';
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  const token = bearerMatch?.[1]?.trim();

  if (token) {
    try {
      const payload = jwt.verify(token, secret) as { userId?: unknown };
      if (typeof payload.userId === 'number') {
        req.user = { userId: payload.userId };
        next();
        return;
      }
    } catch {
      /* Expired/malformed demo/guest JWT — still allow OIDC session cookie below. */
    }
  }

  const session = readAppSessionCookie(req);
  if (session && typeof session.userId === 'number') {
    req.user = { userId: session.userId };
    next();
    return;
  }

  throw new ClientError(401, 'authentication required');
}
