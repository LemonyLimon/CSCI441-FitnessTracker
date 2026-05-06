/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { env } from '@server/config/env.js';
import { type ApiErrorCode } from '@shared/api-contracts';
import { ClientError } from './client-error.js';
import { sendError } from './http-response.js';
import { logger } from './logger.js';

/** Centralized Express error handler. */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const toErrorCode = (code: ApiErrorCode): ApiErrorCode => code;

  if (err instanceof ClientError) {
    sendError(res, err.status, {
      code: toErrorCode('client_error'),
      message: err.message,
    });
  } else if (err instanceof ZodError) {
    sendError(res, 400, {
      code: toErrorCode('validation_error'),
      message: 'request validation failed',
      details: err.issues,
    });
  } else if (err instanceof jwt.JsonWebTokenError) {
    sendError(res, 401, {
      code: toErrorCode('invalid_token'),
      message: 'invalid access token',
    });
  } else {
    logger.error({ err }, 'Unhandled server error');
    sendError(res, 500, {
      code: toErrorCode('internal_error'),
      message: 'an unexpected error occurred',
      details:
        env.NODE_ENV === 'development' && err instanceof Error
          ? { message: err.message }
          : undefined,
    });
  }
}
