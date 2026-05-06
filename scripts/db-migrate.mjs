#!/usr/bin/env node
/**
 * Runs drizzle-kit migrate from `server/` with DATABASE_URL from server/.env.
 * Prints a short hint on non-zero exit (some terminals hide stderr from pnpm).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.join(root, 'server');

const child = spawn('pnpm', ['exec', 'drizzle-kit', 'migrate'], {
  cwd: serverDir,
  stdio: 'inherit',
  env: { ...process.env },
  shell: false,
});

child.on('exit', (code, signal) => {
  if (code === 0) {
    process.exit(0);
  }
  console.error(`
db:migrate exited with code ${code}${signal ? ` (signal ${signal})` : ''}.
Hints:
  - Ensure PostgreSQL is running and server/.env DATABASE_URL points at that instance.
  - From repo root:  set -a && . server/.env && set +a && psql "$DATABASE_URL" -c "select 1"
  - If the API errors on column "paymentInfo" (or similar), migrations are behind: run
    pnpm run db:import   # includes drizzle baseline
    pnpm run db:migrate
  - Capture full CLI output:  pnpm -C server exec drizzle-kit migrate 2>&1 | tee /tmp/migrate.log
`);
  process.exit(code ?? 1);
});
