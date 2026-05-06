import { spawnSync } from 'node:child_process';

/**
 * Execute a command and forward stdio.
 */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

/**
 * Execute a command and return stdout as string, or `null` on failure.
 */
function getOutput(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

const configuredBase = process.env.TEST_CHANGED_BASE?.trim();
const baseRef = configuredBase || 'origin/main';

let diffTarget = `${baseRef}...HEAD`;
let changed = getOutput('git', ['diff', '--name-only', diffTarget]);

if (changed === null) {
  // Fallback for environments without `origin/main` (local-only branches).
  const fallbackBase = getOutput('git', ['rev-parse', 'HEAD~1']);
  if (!fallbackBase) {
    console.log('Unable to determine changed files. Running full test suite.');
    process.exit(run('pnpm', ['run', 'test']));
  }
  diffTarget = `${fallbackBase}...HEAD`;
  changed = getOutput('git', ['diff', '--name-only', diffTarget]);
}

if (!changed) {
  console.log(`No changed files detected from ${diffTarget}.`);
  process.exit(0);
}

const changedFiles = changed.split('\n').filter(Boolean);
const clientFiles = changedFiles
  .filter((f) => f.startsWith('client/'))
  .map((f) => f.replace(/^client\//, ''));
const serverFiles = changedFiles
  .filter((f) => f.startsWith('server/'))
  .map((f) => f.replace(/^server\//, ''));

const sharedTriggers = changedFiles.some((f) =>
  [
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    '.github/workflows/ci.yml',
  ].includes(f),
);

let exitCode = 0;

if (sharedTriggers) {
  // Dependency/config shifts can affect both workspaces; run full suite.
  console.log('Shared config/dependency changes detected. Running full test suite.');
  process.exit(run('pnpm', ['run', 'test']));
}

if (clientFiles.length > 0) {
  console.log(`Running related client tests (${clientFiles.length} changed files).`);
  exitCode = Math.max(
    exitCode,
    run('pnpm', ['-C', 'client', 'exec', 'vitest', 'related', '--run', ...clientFiles]),
  );
}

if (serverFiles.length > 0) {
  console.log(`Running related server tests (${serverFiles.length} changed files).`);
  exitCode = Math.max(
    exitCode,
    run('pnpm', ['-C', 'server', 'exec', 'vitest', 'related', '--run', ...serverFiles]),
  );
}

if (clientFiles.length === 0 && serverFiles.length === 0) {
  console.log('No client/server changes detected; skipping test run.');
}

process.exit(exitCode);
