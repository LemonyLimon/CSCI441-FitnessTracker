import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { env } from '@server/config/env.js';

/**
 * Shared application logger.
 * - `silent` in tests to keep test output readable.
 * - `debug` in development for richer local diagnostics.
 */
export const logger = pino({
  level:
    env.NODE_ENV === 'test'
      ? 'silent'
      : env.NODE_ENV === 'development'
        ? 'debug'
        : 'info',
});

/**
 * HTTP request logger middleware with request-id propagation.
 */
export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  genReqId: (req, res) => {
    const existingId = req.headers['x-request-id'];
    const reqId =
      typeof existingId === 'string' && existingId.length > 0
        ? existingId
        : randomUUID();
    res.setHeader('x-request-id', reqId);
    return reqId;
  },
});
