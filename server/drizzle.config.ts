import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: '../database/migrations',
  dbCredentials: {
    // Keep generation usable even before local env is fully configured.
    url: process.env.DATABASE_URL ?? 'postgres://dev:dev@localhost/dev',
  },
});
