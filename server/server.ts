import { createApp } from '@server/app.js';
import { env } from '@server/config/env.js';
import { logger } from '@server/lib/logger.js';

if (
  env.NODE_ENV === 'production' &&
  env.AUTH_OIDC_ENABLED &&
  env.AUTH_FRONTEND_ORIGIN.trim() &&
  env.AUTH_OIDC_REDIRECT_URI.trim()
) {
  try {
    const redirectOrigin = new URL(env.AUTH_OIDC_REDIRECT_URI).origin;
    const frontendOrigin = new URL(env.AUTH_FRONTEND_ORIGIN.trim()).origin;
    if (redirectOrigin === frontendOrigin) {
      logger.warn(
        'AUTH_OIDC_REDIRECT_URI and AUTH_FRONTEND_ORIGIN share the same origin — for Vercel + Render the callback should usually be the API host and the frontend origin the SPA host.',
      );
    }
  } catch {
    /* ignore malformed URLs — env validation will surface elsewhere */
  }
}

const app = createApp();
app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Listening on port');
});
