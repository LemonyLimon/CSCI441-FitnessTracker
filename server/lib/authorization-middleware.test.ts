import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { cookieSigningSecret } from '@server/config/env.js';
import { authMiddleware } from '@server/lib/authorization-middleware.js';
import { ClientError } from '@server/lib/client-error.js';

function mockReq(partial: {
  authorization?: string;
  cookie?: string;
}): Parameters<typeof authMiddleware>[0] {
  return {
    get(name: string): string | undefined {
      const lower = name.toLowerCase();
      if (lower === 'authorization' && partial.authorization) {
        return partial.authorization;
      }
      if (lower === 'cookie' && partial.cookie) {
        return partial.cookie;
      }
      return undefined;
    },
  } as Parameters<typeof authMiddleware>[0];
}

describe('authMiddleware', () => {
  it('accepts a valid Bearer JWT and sets req.user', () => {
    const secret = process.env.TOKEN_SECRET ?? 'test-token-secret';
    const token = jwt.sign({ userId: 42 }, secret, { expiresIn: '1h' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = {} as Parameters<typeof authMiddleware>[1];
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ userId: 42 });
  });

  it('falls through invalid Bearer and accepts app session cookie', () => {
    const bad = jwt.sign({ userId: 1 }, 'wrong-secret', { expiresIn: '1h' });
    const sessionToken = jwt.sign(
      { sid: randomUUID(), userId: 99 },
      cookieSigningSecret(),
      { expiresIn: '1h' },
    );
    const req = mockReq({
      authorization: `Bearer ${bad}`,
      cookie: `ftrack_session=${sessionToken}`,
    });
    const res = {} as Parameters<typeof authMiddleware>[1];
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ userId: 99 });
  });

  it('throws ClientError when no valid Bearer or session cookie', () => {
    const req = mockReq({});
    const res = {} as Parameters<typeof authMiddleware>[1];
    const next = vi.fn();

    expect(() => authMiddleware(req, res, next)).toThrow(ClientError);
    expect(next).not.toHaveBeenCalled();
  });
});
