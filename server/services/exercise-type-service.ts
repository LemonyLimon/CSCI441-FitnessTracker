import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { DbClient, getDrizzleDb } from '@server/db/drizzle.js';
import { exerciseTypes } from '@server/db/schema.js';
import { ClientError } from '@server/lib/client-error.js';

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

export type ExerciseRecord = {
  exerciseTypeId: number;
  userId: number | null;
  name: string;
  muscleGroup: string | null;
  category: string;
  createdAt: Date;
};

/** Return seeded exercises plus caller-owned custom exercises. */
export async function listExercises(userId: number): Promise<ExerciseRecord[]> {
  const db = requireDb();
  return db
    .select()
    .from(exerciseTypes)
    .where(or(isNull(exerciseTypes.userId), eq(exerciseTypes.userId, userId)))
    .orderBy(asc(exerciseTypes.name));
}

/** Create a custom exercise row scoped to one user. */
export async function createCustomExercise(
  userId: number,
  input: { name: string; muscleGroup?: string | null; category?: string },
): Promise<ExerciseRecord> {
  const db = requireDb();
  const [created] = await db
    .insert(exerciseTypes)
    .values({
      userId,
      name: input.name,
      muscleGroup: input.muscleGroup ?? null,
      category: input.category ?? 'resistance',
    })
    .returning();
  return created;
}

/** Update only caller-owned custom exercises (seed rows are immutable). */
export async function updateCustomExercise(
  userId: number,
  exerciseTypeId: number,
  input: { name?: string; muscleGroup?: string | null; category?: string },
): Promise<ExerciseRecord> {
  const db = requireDb();
  const [updated] = await db
    .update(exerciseTypes)
    .set({
      name: input.name,
      muscleGroup: input.muscleGroup,
      category: input.category,
    })
    .where(
      and(
        eq(exerciseTypes.exerciseTypeId, exerciseTypeId),
        eq(exerciseTypes.userId, userId),
      ),
    )
    .returning();
  if (!updated) {
    throw new ClientError(404, 'custom exercise not found');
  }
  return updated;
}

/** Delete only caller-owned custom exercises. */
export async function deleteCustomExercise(
  userId: number,
  exerciseTypeId: number,
): Promise<void> {
  const db = requireDb();
  const [removed] = await db
    .delete(exerciseTypes)
    .where(
      and(
        eq(exerciseTypes.exerciseTypeId, exerciseTypeId),
        eq(exerciseTypes.userId, userId),
      ),
    )
    .returning({ exerciseTypeId: exerciseTypes.exerciseTypeId });
  if (!removed) throw new ClientError(404, 'custom exercise not found');
}

/** Validate that exercise can be linked to caller's workout payload. */
export async function assertExerciseAssignableToUser(
  userId: number,
  exerciseTypeId: number,
): Promise<void> {
  const db = requireDb();
  const [row] = await db
    .select({
      exerciseTypeId: exerciseTypes.exerciseTypeId,
    })
    .from(exerciseTypes)
    .where(
      and(
        eq(exerciseTypes.exerciseTypeId, exerciseTypeId),
        or(isNull(exerciseTypes.userId), eq(exerciseTypes.userId, userId)),
      ),
    )
    .limit(1);
  if (!row)
    throw new ClientError(400, 'exercise is not available for this user');
}
