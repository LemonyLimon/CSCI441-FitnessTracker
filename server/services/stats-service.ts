import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import type { UserDashboardStats } from '@shared/api-contracts';
import { DbClient, getDrizzleDb } from '@server/db/drizzle.js';
import { exerciseTypes, users, workouts } from '@server/db/schema.js';
import { ClientError } from '@server/lib/client-error.js';
import {
  poundsToDisplayWeight,
  unitSystemFromStandardUnits,
} from '@server/lib/unit-conversion.js';

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

/** Load aggregate workout stats and PRs for one user dashboard. */
export async function readMyStats(userId: number): Promise<UserDashboardStats> {
  const db = requireDb();
  const [userPref] = await db
    .select({ standardUnits: users.standardUnits })
    .from(users)
    .where(eq(users.userId, userId))
    .limit(1);
  if (!userPref) throw new ClientError(404, 'user not found');
  const unitSystem = unitSystemFromStandardUnits(userPref.standardUnits);

  const [countRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(workouts)
    .where(eq(workouts.userId, userId));
  const workoutsCompleted = countRow?.total ?? 0;

  const [heaviest] = await db
    .select({
      workoutId: workouts.workoutId,
      title: workouts.title,
      value: workouts.userWeight,
    })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.userWeight), asc(workouts.workoutId))
    .limit(1);

  const [fastest] = await db
    .select({
      workoutId: workouts.workoutId,
      title: workouts.title,
      durationMinutes: workouts.durationMinutes,
    })
    .from(workouts)
    .where(
      and(eq(workouts.userId, userId), isNotNull(workouts.durationMinutes)),
    )
    .orderBy(asc(workouts.durationMinutes), asc(workouts.workoutId))
    .limit(1);

  const [highestReps] = await db
    .select({
      workoutId: workouts.workoutId,
      title: workouts.title,
      reps: workouts.reps,
    })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), isNotNull(workouts.reps)))
    .orderBy(desc(workouts.reps), asc(workouts.workoutId))
    .limit(1);

  const byExerciseRows = await db
    .select({
      exerciseTypeId: workouts.exerciseTypeId,
      exerciseName: exerciseTypes.name,
      maxWeight: sql<number | null>`max(${workouts.userWeight})`,
      maxReps: sql<number | null>`max(${workouts.reps})`,
      fastestDurationMinutes: sql<
        number | null
      >`min(${workouts.durationMinutes})`,
    })
    .from(workouts)
    .leftJoin(
      exerciseTypes,
      eq(exerciseTypes.exerciseTypeId, workouts.exerciseTypeId),
    )
    .where(eq(workouts.userId, userId))
    .groupBy(workouts.exerciseTypeId, exerciseTypes.name)
    .orderBy(asc(exerciseTypes.name));

  return {
    unitSystem,
    workoutsCompleted,
    personalRecords: {
      heaviestWeight: {
        value: poundsToDisplayWeight(
          heaviest?.value != null ? Number(heaviest.value) : null,
          unitSystem,
        ),
        workoutId: heaviest?.workoutId ?? null,
        title: heaviest?.title ?? null,
      },
      fastestWorkout: {
        durationMinutes: fastest?.durationMinutes ?? null,
        workoutId: fastest?.workoutId ?? null,
        title: fastest?.title ?? null,
      },
      highestReps: {
        reps: highestReps?.reps ?? null,
        workoutId: highestReps?.workoutId ?? null,
        title: highestReps?.title ?? null,
      },
      byExercise: byExerciseRows.map((row) => ({
        exerciseTypeId: row.exerciseTypeId,
        exerciseName: row.exerciseName ?? 'Unassigned',
        maxWeight: poundsToDisplayWeight(
          row.maxWeight != null ? Number(row.maxWeight) : null,
          unitSystem,
        ),
        maxReps: row.maxReps,
        fastestDurationMinutes: row.fastestDurationMinutes,
      })),
    },
  };
}
