import { createApp } from '@server/app.js';
import { env } from '@server/config/env.js';
import { logger } from '@server/lib/logger.js';

const app = createApp();
app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Listening on port');
});
