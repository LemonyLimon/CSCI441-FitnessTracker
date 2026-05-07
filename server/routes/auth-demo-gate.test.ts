import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@server/config/env.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@server/config/env.js')>();
  return {
    ...mod,
    env: {
      ...mod.env,
      AUTH_DEMO_ENABLED: false,
    },
  };
});

describe('demo auth gate (AUTH_DEMO_ENABLED=false)', () => {
  let app: Express;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(async () => {
    process.env.TOKEN_SECRET = process.env.TOKEN_SECRET ?? 'test-token-secret';
    process.env.DATABASE_URL = originalDatabaseUrl ?? '';
    const { createApp } = await import('@server/app.js');
    app = createApp();
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('returns 403 from POST /api/auth/guest', async () => {
    const res = await request(app).post('/api/auth/guest').expect(403);
    expect(res.body.error).toEqual(
      expect.objectContaining({
        message: 'demo authentication is disabled',
      }),
    );
  });

  it('returns 403 from POST /api/auth/sign-in', async () => {
    const res = await request(app)
      .post('/api/auth/sign-in')
      .send({ email: 'user@example.com', password: 'secret' })
      .expect(403);
    expect(res.body.error).toEqual(
      expect.objectContaining({
        message: 'demo authentication is disabled',
      }),
    );
  });

  it('still returns auth options with demo: false', async () => {
    const res = await request(app).get('/api/auth/options').expect(200);
    expect(res.headers['cache-control']).toMatch(/no-store/);
    expect(res.body.data).toEqual({
      oidc: false,
      demo: false,
    });
  });
});
