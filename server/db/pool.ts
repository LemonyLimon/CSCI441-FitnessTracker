import pg from 'pg';
import { env } from '@server/config/env.js';

let pool: pg.Pool | undefined;

function poolUsesSsl(connectionString: string): boolean {
  if (env.DATABASE_SSL === 'true') return true;
  if (env.DATABASE_SSL === 'false') return false;
  try {
    const { hostname } = new URL(connectionString);
    const h = hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') {
      return false;
    }
  } catch {
    return true;
  }
  return true;
}

/**
 * Return a lazily initialized `pg.Pool` when `DATABASE_URL` is configured.
 * Returns `null` for environments where database access is intentionally disabled.
 */
export function getDbPool(): pg.Pool | null {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) return null;

  if (!pool) {
    const useSsl = poolUsesSsl(connectionString);
    pool = new pg.Pool({
      connectionString,
      ...(useSsl
        ? { ssl: { rejectUnauthorized: false } }
        : { ssl: false }),
    });
  }

  return pool;
}
