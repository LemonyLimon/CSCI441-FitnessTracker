import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { eq, sql } from 'drizzle-orm';
import { env } from '@server/config/env.js';
import { DbClient, getDrizzleDb } from '@server/db/drizzle.js';
import { users } from '@server/db/schema.js';
import { ClientError } from '@server/lib/client-error.js';

/** Public session / `GET /api/me` payload (no secrets). */
export type SessionUser = {
  userId: number;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  uiHighContrast: boolean;
  uiTextSize: string;
  height: number | null;
  paymentInfo: string | null;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
};

/** DB row shape used to build `SessionUser` (includes hash for `hasPassword` only). */
export type UserRowForPublic = {
  userId: number;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  uiHighContrast: boolean;
  uiTextSize: string;
  passwordHash: string | null;
  height: number | null;
  paymentInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthTokenPayload = { userId: number };

/** Return configured DB client or fail with setup guidance. */
function requireDb(): DbClient {
  const db = getDrizzleDb();
  if (!db) {
    throw new ClientError(
      503,
      'database is not configured. set DATABASE_URL and run migrations.',
    );
  }
  return db;
}

/** Sign a short-lived access token used by protected API routes. */
export function signAccessToken(userId: number): string {
  return jwt.sign({ userId } satisfies AuthTokenPayload, env.TOKEN_SECRET, {
    expiresIn: '7d',
  });
}

/** Shared `.returning()` / `.select()` shape for user rows (includes hash for `hasPassword` mapping only). */
export const usersPublicReturning = {
  userId: users.userId,
  email: users.email,
  displayName: users.displayName,
  isGuest: users.isGuest,
  uiHighContrast: users.uiHighContrast,
  uiTextSize: users.uiTextSize,
  passwordHash: users.passwordHash,
  height: users.height,
  paymentInfo: users.paymentInfo,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

/** Map a user row to the API-safe session shape (never exposes password hash). */
export function userRowToSessionUser(row: UserRowForPublic): SessionUser {
  return {
    userId: row.userId,
    email: row.email,
    displayName: row.displayName,
    isGuest: row.isGuest,
    uiHighContrast: row.uiHighContrast,
    uiTextSize: row.uiTextSize,
    height: row.height,
    paymentInfo: row.paymentInfo,
    hasPassword: row.passwordHash != null && row.passwordHash.length > 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Create a guest identity and issue a JWT for demo access. */
export async function createGuestSession(): Promise<{
  token: string;
  user: SessionUser;
}> {
  const db = requireDb();
  const id = randomUUID();
  const authSubject = `guest:${id}`;
  const displayName = `Guest ${id.slice(0, 8)}`;

  const [created] = await db
    .insert(users)
    .values({
      authSubject,
      displayName,
      isGuest: true,
    })
    .returning(usersPublicReturning);

  if (!created) throw new ClientError(500, 'failed to create guest session');
  return {
    token: signAccessToken(created.userId),
    user: userRowToSessionUser(created),
  };
}

/** Validate email/password credentials and issue a JWT on success. */
export async function signInUser(
  email: string,
  password: string,
): Promise<{ token: string; user: SessionUser }> {
  const db = requireDb();
  const [found] = await db
    .select(usersPublicReturning)
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!found?.passwordHash) {
    throw new ClientError(401, 'invalid email or password');
  }
  const isValid = await argon2.verify(found.passwordHash, password);
  if (!isValid) {
    throw new ClientError(401, 'invalid email or password');
  }

  return {
    token: signAccessToken(found.userId),
    user: userRowToSessionUser(found),
  };
}

/** Load current user profile fields used by the client app shell. */
export async function readMe(userId: number): Promise<SessionUser> {
  const db = requireDb();
  const [row] = await db
    .select(usersPublicReturning)
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);
  if (!row) throw new ClientError(404, 'user not found');
  return userRowToSessionUser(row);
}

/** Persist accessibility preferences for the authenticated user. */
export async function updateMyPreferences(
  userId: number,
  prefs: {
    uiHighContrast?: boolean;
    uiTextSize?: 'standard' | 'medium' | 'large' | 'xl' | 'normal';
  },
): Promise<SessionUser> {
  const db = requireDb();
  const [updated] = await db
    .update(users)
    .set({
      ...(prefs.uiHighContrast !== undefined
        ? { uiHighContrast: prefs.uiHighContrast }
        : {}),
      ...(prefs.uiTextSize !== undefined ? { uiTextSize: prefs.uiTextSize } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(users.userId, userId))
    .returning(usersPublicReturning);
  if (!updated) throw new ClientError(404, 'user not found');
  return userRowToSessionUser(updated);
}
