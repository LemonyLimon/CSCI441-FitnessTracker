import { and, eq } from 'drizzle-orm';
import { DbClient, getDrizzleDb } from '@server/db/drizzle.js';
import { exercises, workouts } from '@server/db/schema.js';
import { ClientError } from '@server/lib/client-error.js';

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

async function assertWorkoutOwnedByUser(
  db: DbClient,
  userId: number,
  workoutId: number,
): Promise<void> {
  const [owned] = await db
    .select({ workoutId: workouts.workoutId })
    .from(workouts)
    .where(and(eq(workouts.workoutId, workoutId), eq(workouts.userId, userId)))
    .limit(1);
  if (!owned) throw new ClientError(404, 'workout not found');
}

export type ExerciseRecord = {
  exerciseId: number;
  workoutId: number;
  type: number;
  sets: number | null;
  reps: number | null;
  weights: string | null;
  duration: string | null;
  distance: string | null;
  restTime: string | null;
};

/** List exercises scoped to one owned workout. */
export async function listWorkoutExercises(
  userId: number,
  workoutId: number,
): Promise<ExerciseRecord[]> {
  const db = requireDb();
  await assertWorkoutOwnedByUser(db, userId, workoutId);
  const rows = await db
    .select()
    .from(exercises)
    .where(eq(exercises.workoutId, workoutId));
  return rows as ExerciseRecord[];
}

/** Create one exercise row for an owned workout. */
export async function createExercise(
  userId: number,
  input: {
    workoutId: number;
    type: number;
    sets?: number | null;
    reps?: number | null;
    weights?: string | null;
    duration?: string | null;
    distance?: string | null;
    restTime?: string | null;
  },
): Promise<ExerciseRecord> {
  const db = requireDb();
  await assertWorkoutOwnedByUser(db, userId, input.workoutId);
  const [created] = await db
    .insert(exercises)
    .values({
      workoutId: input.workoutId,
      type: input.type,
      sets: input.sets ?? null,
      reps: input.reps ?? null,
      weights: input.weights ?? null,
      duration: input.duration ?? null,
      distance: input.distance ?? null,
      restTime: input.restTime ?? null,
    })
    .returning();
  return created as ExerciseRecord;
}

/** Update one owned exercise row by id. */
export async function updateExercise(
  userId: number,
  exerciseId: number,
  input: {
    type?: number;
    sets?: number | null;
    reps?: number | null;
    weights?: string | null;
    duration?: string | null;
    distance?: string | null;
    restTime?: string | null;
  },
): Promise<ExerciseRecord> {
  const db = requireDb();
  const [row] = await db
    .select({ workoutId: exercises.workoutId })
    .from(exercises)
    .where(eq(exercises.exerciseId, exerciseId))
    .limit(1);
  if (!row) throw new ClientError(404, 'exercise not found');
  await assertWorkoutOwnedByUser(db, userId, row.workoutId);

  const [updated] = await db
    .update(exercises)
    .set({
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.sets !== undefined ? { sets: input.sets } : {}),
      ...(input.reps !== undefined ? { reps: input.reps } : {}),
      ...(input.weights !== undefined ? { weights: input.weights } : {}),
      ...(input.duration !== undefined ? { duration: input.duration } : {}),
      ...(input.distance !== undefined ? { distance: input.distance } : {}),
      ...(input.restTime !== undefined ? { restTime: input.restTime } : {}),
    })
    .where(eq(exercises.exerciseId, exerciseId))
    .returning();
  if (!updated) throw new ClientError(404, 'exercise not found');
  return updated as ExerciseRecord;
}

/** Delete one owned exercise row by id. */
export async function deleteExercise(
  userId: number,
  exerciseId: number,
): Promise<void> {
  const db = requireDb();
  const [row] = await db
    .select({ workoutId: exercises.workoutId })
    .from(exercises)
    .where(eq(exercises.exerciseId, exerciseId))
    .limit(1);
  if (!row) throw new ClientError(404, 'exercise not found');
  await assertWorkoutOwnedByUser(db, userId, row.workoutId);

  const [removed] = await db
    .delete(exercises)
    .where(eq(exercises.exerciseId, exerciseId))
    .returning({ exerciseId: exercises.exerciseId });
  if (!removed) throw new ClientError(404, 'exercise not found');
}
