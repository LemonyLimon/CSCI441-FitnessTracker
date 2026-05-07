import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Align TLS with `server/db/pool.ts` so `drizzle-kit migrate` can reach Neon
 * (and other remote Postgres) the same way the API does.
 */
function migrateSsl(
  connectionString: string,
): false | { rejectUnauthorized: boolean } {
  const mode = process.env.DATABASE_SSL ?? 'auto';
  if (mode === 'true') return { rejectUnauthorized: false };
  if (mode === 'false') return false;
  try {
    const { hostname } = new URL(connectionString);
    const h = hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') {
      return false;
    }
  } catch {
    return { rejectUnauthorized: false };
  }
  return { rejectUnauthorized: false };
}

const databaseUrl =
  process.env.DATABASE_URL?.trim() ?? 'postgres://dev:dev@localhost/dev';

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim())
) {
  throw new Error(
    'DATABASE_URL is required for drizzle-kit migrate on Render. Add DATABASE_URL in the Render service Environment (Blueprint: set the DATABASE_URL secret).',
  );
}

const ssl = migrateSsl(databaseUrl);

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: '../database/migrations',
  dbCredentials: {
    url: databaseUrl,
    ssl,
  },
});
