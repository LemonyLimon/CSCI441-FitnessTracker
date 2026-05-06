import { spawnSync } from 'node:child_process';

const DEV_PORTS = [5173, 8080];

/**
 * Return PIDs currently listening on a TCP port.
 */
function getListeningPids(port) {
  const result = spawnSync(
    'lsof',
    ['-t', `-iTCP:${port}`, '-sTCP:LISTEN', '-n', '-P'],
    { encoding: 'utf8' },
  );

  if (result.status !== 0 || !result.stdout.trim()) return [];
  return result.stdout
    .trim()
    .split('\n')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

/**
 * Attempt graceful termination of a process by PID.
 */
function killPid(pid) {
  const result = spawnSync('kill', [String(pid)], { encoding: 'utf8' });
  return result.status === 0;
}

let didKillAny = false;

for (const port of DEV_PORTS) {
  const pids = getListeningPids(port);
  if (pids.length === 0) {
    console.log(`Port ${port}: already free`);
    continue;
  }

  for (const pid of pids) {
    const killed = killPid(pid);
    if (killed) {
      didKillAny = true;
      console.log(`Port ${port}: stopped PID ${pid}`);
    } else {
      console.warn(`Port ${port}: failed to stop PID ${pid}`);
    }
  }
}

if (!didKillAny) {
  console.log('No stale dev listeners found.');
}
