import { and, eq } from 'drizzle-orm';
import { DbClient, getDrizzleDb } from '@server/db/drizzle.js';
import { exerciseTypes, goals } from '@server/db/schema.js';
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

export type GoalRecord = {
  goalId: number;
  userId: number;
  targetWeight: string | null;
  exerciseType: number | null;
  targetTime: string | null;
  targetDistance: string | null;
};

/** List all goals owned by one user. */
export async function listGoals(userId: number): Promise<GoalRecord[]> {
  const db = requireDb();
  return db.select().from(goals).where(eq(goals.userId, userId));
}

/** Create one goal owned by one user. */
export async function createGoal(
  userId: number,
  input: {
    exerciseType?: number | null;
    targetWeight?: string | null;
    targetTime?: string | null;
    targetDistance?: string | null;
  },
): Promise<GoalRecord> {
  const db = requireDb();

  if (input.exerciseType != null) {
    const [exerciseTypeRow] = await db
      .select({ id: exerciseTypes.exerciseTypeId })
      .from(exerciseTypes)
      .where(eq(exerciseTypes.exerciseTypeId, input.exerciseType))
      .limit(1);
    if (!exerciseTypeRow) throw new ClientError(400, 'exercise type not found');
  }

  const [created] = await db
    .insert(goals)
    .values({
      userId,
      exerciseType: input.exerciseType ?? null,
      targetWeight: input.targetWeight ?? null,
      targetTime: input.targetTime ?? null,
      targetDistance: input.targetDistance ?? null,
    })
    .returning();

  return created;
}

/** Update one user-owned goal (partial). */
export async function updateGoal(
  userId: number,
  goalId: number,
  input: {
    exerciseType?: number | null;
    targetWeight?: string | null;
    targetTime?: string | null;
    targetDistance?: string | null;
  },
): Promise<GoalRecord> {
  const db = requireDb();

  if (input.exerciseType !== undefined && input.exerciseType != null) {
    const [exerciseTypeRow] = await db
      .select({ id: exerciseTypes.exerciseTypeId })
      .from(exerciseTypes)
      .where(eq(exerciseTypes.exerciseTypeId, input.exerciseType))
      .limit(1);
    if (!exerciseTypeRow) throw new ClientError(400, 'exercise type not found');
  }

  const hasAnySet =
    input.exerciseType !== undefined ||
    input.targetWeight !== undefined ||
    input.targetTime !== undefined ||
    input.targetDistance !== undefined;

  if (!hasAnySet) {
    const [row] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.goalId, goalId), eq(goals.userId, userId)))
      .limit(1);
    if (!row) throw new ClientError(404, 'goal not found');
    return row;
  }

  const [updated] = await db
    .update(goals)
    .set({
      ...(input.exerciseType !== undefined
        ? { exerciseType: input.exerciseType }
        : {}),
      ...(input.targetWeight !== undefined
        ? { targetWeight: input.targetWeight }
        : {}),
      ...(input.targetTime !== undefined
        ? { targetTime: input.targetTime }
        : {}),
      ...(input.targetDistance !== undefined
        ? { targetDistance: input.targetDistance }
        : {}),
    })
    .where(and(eq(goals.goalId, goalId), eq(goals.userId, userId)))
    .returning();

  if (!updated) throw new ClientError(404, 'goal not found');
  return updated;
}

/** Delete one user-owned goal. */
export async function deleteGoal(
  userId: number,
  goalId: number,
): Promise<void> {
  const db = requireDb();
  const [removed] = await db
    .delete(goals)
    .where(and(eq(goals.goalId, goalId), eq(goals.userId, userId)))
    .returning({ goalId: goals.goalId });

  if (!removed) throw new ClientError(404, 'goal not found');
}
