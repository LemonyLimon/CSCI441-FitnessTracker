import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@server/config/env.js';
import { ClientError } from './client-error.js';

const secret = env.TOKEN_SECRET;

/** Validate bearer token and attach decoded user to request context. */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // The token will be in the Authorization header with the format `Bearer ${token}`
  const token = req.get('authorization')?.split('Bearer ')[1];
  if (!token) {
    throw new ClientError(401, 'authentication required');
  }
  req.user = jwt.verify(token, secret) as Request['user'];
  next();
}
