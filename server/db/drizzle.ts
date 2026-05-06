import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { getDbPool } from './pool.js';
import * as schema from './schema.js';

export type DbClient = NodePgDatabase<typeof schema>;

/**
 * Return a Drizzle client backed by the shared pg pool.
 * Returns `null` when DATABASE_URL is not configured.
 */
export function getDrizzleDb(): DbClient | null {
  const pool = getDbPool();
  if (!pool) return null;
  return drizzle(pool, { schema });
}
