import { and, eq, ne, sql } from 'drizzle-orm';
import argon2 from 'argon2';
import {
  usersPublicReturning,
  type UserRowForPublic,
} from '@server/services/auth-service.js';
import { DbClient, getDrizzleDb } from '@server/db/drizzle.js';
import { users } from '@server/db/schema.js';
import { ClientError } from '@server/lib/client-error.js';

export type UserProfileRecord = UserRowForPublic;

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

/** Ensure email is not taken by another user. */
async function assertEmailAvailable(
  db: DbClient,
  email: string,
  userId: number,
): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const [other] = await db
    .select({ userId: users.userId })
    .from(users)
    .where(and(eq(users.email, normalized), ne(users.userId, userId)))
    .limit(1);
  if (other) {
    throw new ClientError(409, 'email already in use');
  }
}

/** Return one user profile by owner id. */
export async function readUserProfile(
  userId: number,
): Promise<UserProfileRecord> {
  const db = requireDb();
  const [row] = await db
    .select(usersPublicReturning)
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);

  if (!row) throw new ClientError(404, 'user not found');
  return row;
}

/** Create / initialize profile fields on an existing user row (HTTP 201). */
export async function createUserProfile(
  userId: number,
  input: {
    displayName: string;
    email?: string | null;
    passwordPlain?: string;
    height?: number | null;
    paymentInfo?: string | null;
  },
): Promise<UserProfileRecord> {
  const db = requireDb();
  const [exists] = await db
    .select({ userId: users.userId })
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);
  if (!exists) throw new ClientError(404, 'user not found');

  let email: string | null | undefined = input.email;
  if (email !== undefined && email !== null) {
    await assertEmailAvailable(db, email, userId);
    email = email.toLowerCase().trim();
  }

  let passwordHash: string | undefined;
  if (input.passwordPlain !== undefined) {
    passwordHash = await argon2.hash(input.passwordPlain);
  }

  const [updated] = await db
    .update(users)
    .set({
      displayName: input.displayName,
      ...(email !== undefined ? { email } : {}),
      ...(passwordHash !== undefined ? { passwordHash } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.paymentInfo !== undefined
        ? { paymentInfo: input.paymentInfo }
        : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(users.userId, userId))
    .returning(usersPublicReturning);

  if (!updated) throw new ClientError(404, 'user not found');
  return updated;
}

/** Replace mutable profile fields (HTTP 200). */
export async function replaceUserProfile(
  userId: number,
  input: {
    displayName: string;
    email?: string | null;
    passwordPlain?: string;
    height?: number | null;
    paymentInfo?: string | null;
  },
): Promise<UserProfileRecord> {
  const db = requireDb();
  const [exists] = await db
    .select({ userId: users.userId })
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);
  if (!exists) throw new ClientError(404, 'user not found');

  let email: string | null | undefined = input.email;
  if (email !== undefined && email !== null) {
    await assertEmailAvailable(db, email, userId);
    email = email.toLowerCase().trim();
  }

  let passwordHash: string | undefined;
  if (input.passwordPlain !== undefined) {
    passwordHash = await argon2.hash(input.passwordPlain);
  }

  const [updated] = await db
    .update(users)
    .set({
      displayName: input.displayName,
      ...(email !== undefined ? { email } : {}),
      ...(passwordHash !== undefined ? { passwordHash } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.paymentInfo !== undefined
        ? { paymentInfo: input.paymentInfo }
        : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(users.userId, userId))
    .returning(usersPublicReturning);

  if (!updated) throw new ClientError(404, 'user not found');
  return updated;
}

/** Partial update of profile fields. */
export async function updateUserProfile(
  userId: number,
  input: {
    displayName?: string;
    email?: string | null;
    passwordPlain?: string;
    height?: number | null;
    paymentInfo?: string | null;
  },
): Promise<UserProfileRecord> {
  const db = requireDb();

  const hasChange =
    input.displayName !== undefined ||
    input.email !== undefined ||
    input.passwordPlain !== undefined ||
    input.height !== undefined ||
    input.paymentInfo !== undefined;

  if (!hasChange) {
    return readUserProfile(userId);
  }

  if (input.email !== undefined && input.email !== null) {
    await assertEmailAvailable(db, input.email, userId);
  }

  let passwordHash: string | undefined;
  if (input.passwordPlain !== undefined) {
    passwordHash = await argon2.hash(input.passwordPlain);
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(input.displayName !== undefined
        ? { displayName: input.displayName }
        : {}),
      ...(input.email !== undefined
        ? {
            email:
              input.email === null ? null : input.email.toLowerCase().trim(),
          }
        : {}),
      ...(passwordHash !== undefined ? { passwordHash } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.paymentInfo !== undefined
        ? { paymentInfo: input.paymentInfo }
        : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(users.userId, userId))
    .returning(usersPublicReturning);

  if (!updated) throw new ClientError(404, 'user not found');
  return updated;
}

/** Clear optional profile fields (`height`, `payment_info`). Does not delete the user. */
export async function resetUserProfile(userId: number): Promise<void> {
  const db = requireDb();
  const [updated] = await db
    .update(users)
    .set({
      height: null,
      paymentInfo: null,
      updatedAt: sql`now()`,
    })
    .where(eq(users.userId, userId))
    .returning({ userId: users.userId });
  if (!updated) throw new ClientError(404, 'user not found');
}
