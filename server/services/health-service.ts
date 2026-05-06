import { sql } from 'drizzle-orm';
import { getDrizzleDb } from '@server/db/drizzle.js';
import { logger } from '@server/lib/logger.js';

export type HealthReport = {
  api: 'ok';
  database: 'ok' | 'unavailable' | 'not_configured';
  checkedAt: string;
};

/**
 * Build an API/database health report.
 * - `not_configured` when DATABASE_URL is absent
 * - `unavailable` when connectivity/query fails
 */
export async function readHealthReport(): Promise<HealthReport> {
  const checkedAt = new Date().toISOString();
  const db = getDrizzleDb();

  if (!db) {
    return {
      api: 'ok',
      database: 'not_configured',
      checkedAt,
    };
  }

  try {
    await db.execute(sql`select 1 as ok`);
    return {
      api: 'ok',
      database: 'ok',
      checkedAt,
    };
  } catch (err) {
    logger.warn({ err }, 'Database health check failed');
    return {
      api: 'ok',
      database: 'unavailable',
      checkedAt,
    };
  }
}
