import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '@server/lib/http-response.js';
import { requireUserId } from '@server/lib/request-user.js';
import { readMyStats } from '@server/services/stats-service.js';

/** Return aggregated dashboard stats for the authenticated user. */
export async function getMyStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await readMyStats(requireUserId(req));
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}
