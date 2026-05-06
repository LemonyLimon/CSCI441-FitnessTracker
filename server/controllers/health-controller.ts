import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '@server/lib/http-response.js';
import { readHealthReport } from '@server/services/health-service.js';

/** Handle `GET /api/health`. */
export async function readHealth(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const report = await readHealthReport();
    sendSuccess(res, report, 200);
  } catch (err) {
    next(err);
  }
}

/** Handle `GET /api/ready` with stricter dependency readiness checks. */
export async function readReady(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const report = await readHealthReport();
    const statusCode = report.database === 'ok' ? 200 : 503;
    sendSuccess(res, report, statusCode);
  } catch (err) {
    next(err);
  }
}
