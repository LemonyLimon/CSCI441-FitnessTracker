import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDrizzleDb } from '@server/db/drizzle.js';
import { logger } from '@server/lib/logger.js';
import { readHealthReport } from './health-service.js';

vi.mock('@server/db/drizzle.js', () => ({
  getDrizzleDb: vi.fn(),
}));

describe('readHealthReport', () => {
  const getDrizzleDbMock = vi.mocked(getDrizzleDb);

  beforeEach(() => {
    getDrizzleDbMock.mockReset();
    vi.restoreAllMocks();
  });

  it('returns not_configured when database pool is unavailable', async () => {
    getDrizzleDbMock.mockReturnValue(null);

    const report = await readHealthReport();

    expect(report.api).toBe('ok');
    expect(report.database).toBe('not_configured');
    expect(typeof report.checkedAt).toBe('string');
  });

  it('returns ok when the database query succeeds', async () => {
    const execute = vi.fn(async () => ({ rows: [{ ok: 1 }] }));
    getDrizzleDbMock.mockReturnValue({ execute } as never);

    const report = await readHealthReport();

    expect(execute).toHaveBeenCalled();
    expect(report.database).toBe('ok');
  });

  it('returns unavailable when the database query fails', async () => {
    const execute = vi.fn(async () => {
      throw new Error('db down');
    });
    getDrizzleDbMock.mockReturnValue({ execute } as never);
    const loggerWarnSpy = vi
      .spyOn(logger, 'warn')
      .mockImplementation(() => logger);

    const report = await readHealthReport();

    expect(report.database).toBe('unavailable');
    expect(loggerWarnSpy).toHaveBeenCalled();
  });
});
