import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from '@server/config/env.js';
import { errorMiddleware, httpLogger } from '@server/lib/index.js';
import apiRouter from '@server/routes/api.js';

/**
 * Parse comma-separated CORS origin list from environment config.
 */
function parseCorsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Construct and configure the Express application instance.
 * Keep server startup concerns in `server.ts`.
 */
export function createApp(): express.Express {
  const app = express();
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  const allowedOrigins = parseCorsOrigins();
  const apiReadRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const apiWriteRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_WRITE_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Create paths for static directories.
  const reactStaticDir = new URL('../client/dist', import.meta.url).pathname;
  const uploadsStaticDir = new URL('public', import.meta.url).pathname;

  // Registers middleware to the app. This is the order in which the middleware is applied to a request.
  app.use(helmet());
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.static(reactStaticDir));
  // Static directory for file uploads server/public/.
  app.use(express.static(uploadsStaticDir));
  app.use(httpLogger);
  app.use(express.json());
  app.use('/api', apiReadRateLimiter);
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      apiWriteRateLimiter(req, res, next);
      return;
    }
    next();
  });

  app.use('/api', apiRouter);

  /*
   * Handles paths that aren't handled by any other route handler.
   * It responds with `index.html` to support page refreshes with React Router.
   * This must be the _last_ route, just before errorMiddleware.
   */
  app.get('/{*path}', (_req, res) =>
    res.sendFile(`${reactStaticDir}/index.html`),
  );

  app.use(errorMiddleware);

  return app;
}
