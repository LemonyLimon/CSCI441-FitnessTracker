type PgErr = { code?: string; constraint?: string; cause?: unknown };

/** Walk `Error.cause` (Drizzle wraps `pg` errors in `DrizzleQueryError`). */
function eachPgErrorInChain(err: unknown): PgErr[] {
  const out: PgErr[] = [];
  let current: unknown = err;
  const seen = new Set<unknown>();
  for (let i = 0; i < 15 && current && typeof current === 'object'; i++) {
    if (seen.has(current)) break;
    seen.add(current);
    const e = current as PgErr;
    out.push(e);
    if (e.cause !== undefined && e.cause !== null) {
      current = e.cause;
      continue;
    }
    break;
  }
  return out;
}

/** PostgreSQL unique violation (optional constraint name). */
export function isPgUniqueViolation(
  err: unknown,
  constraintName?: string,
): boolean {
  const chain = eachPgErrorInChain(err);
  const uniqueHits = chain.filter((e) => e.code === '23505');
  if (uniqueHits.length === 0) return false;
  if (constraintName === undefined) return true;
  return uniqueHits.some((h) => h.constraint === constraintName);
}
