import { Request } from 'express';
import { ClientError } from '@server/lib/client-error.js';

/** Read authenticated userId from request context or throw 401. */
export function requireUserId(req: Request): number {
  const userId = req.user?.userId;
  if (!userId) throw new ClientError(401, 'authentication required');
  return userId;
}
