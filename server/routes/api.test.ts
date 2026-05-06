import request from 'supertest';
import { Express } from 'express';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

describe('api routes', () => {
  let app: Express;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalTokenSecret = process.env.TOKEN_SECRET;

  beforeAll(async () => {
    process.env.TOKEN_SECRET = process.env.TOKEN_SECRET ?? 'test-token-secret';
    const { createApp } = await import('@server/app.js');
    app = createApp();
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  afterAll(() => {
    process.env.TOKEN_SECRET = originalTokenSecret;
  });

  it('returns not_configured from /api/health when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.data.api).toBe('ok');
    expect(res.body.data.database).toBe('not_configured');
    expect(typeof res.body.data.checkedAt).toBe('string');
  });

  it('returns 503 from /api/ready when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    const res = await request(app).get('/api/ready').expect(503);
    expect(res.body.data.database).toBe('not_configured');
  });

  it('returns 401 from protected route without token', async () => {
    const res = await request(app).get('/api/workouts').expect(401);
    expect(res.body.error).toEqual(
      expect.objectContaining({
        code: 'client_error',
        message: 'authentication required',
      }),
    );
  });

  it('returns 401 from GET /api/me/goals without token', async () => {
    const res = await request(app).get('/api/me/goals').expect(401);
    expect(res.body.error).toEqual(
      expect.objectContaining({
        code: 'client_error',
        message: 'authentication required',
      }),
    );
  });

  it('returns 401 from PATCH /api/me/profile without token', async () => {
    const res = await request(app)
      .patch('/api/me/profile')
      .send({ name: 'x' })
      .expect(401);
    expect(res.body.error).toEqual(
      expect.objectContaining({
        code: 'client_error',
        message: 'authentication required',
      }),
    );
  });

  it('returns 401 from GET /api/exercise-types without token', async () => {
    const res = await request(app).get('/api/exercise-types').expect(401);
    expect(res.body.error).toEqual(
      expect.objectContaining({
        code: 'client_error',
        message: 'authentication required',
      }),
    );
  });

  it('returns 401 from GET /api/exercises without token', async () => {
    const res = await request(app)
      .get('/api/exercises')
      .query({ workoutId: 1 })
      .expect(401);
    expect(res.body.error).toEqual(
      expect.objectContaining({
        code: 'client_error',
        message: 'authentication required',
      }),
    );
  });
});
