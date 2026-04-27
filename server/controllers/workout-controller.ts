import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '@server/lib/http-response.js';
import { requireUserId } from '@server/lib/request-user.js';
import {
  displayWeightToPounds,
  poundsToDisplayWeight,
  type UnitSystem,
} from '@server/lib/unit-conversion.js';
import { assertExerciseAssignableToUser } from '@server/services/exercise-type-service.js';
import {
  createWorkout,
  deleteWorkout,
  listWorkouts,
  readUserUnitSystem,
  updateWorkout,
} from '@server/services/workout-service.js';

/** Route param parser for `:workoutId`. */
const workoutIdParams = z.object({
  workoutId: z.coerce.number().int().positive(),
});

const createWorkoutBody = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(4000).nullable().optional(),
  exerciseTypeId: z.coerce.number().int().positive().nullable().optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().nullable().optional(),
  durationMinutes: z.coerce.number().min(0).max(1440).nullable().optional(),
  userWeight: z.coerce.number().positive().finite(),
  reps: z.coerce.number().int().positive(),
});

const patchWorkoutBody = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  exerciseTypeId: z.coerce.number().int().positive().nullable().optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().nullable().optional(),
  durationMinutes: z.coerce.number().min(0).max(1440).nullable().optional(),
  userWeight: z.coerce.number().positive().finite().optional(),
  reps: z.coerce.number().int().positive().optional(),
});

/** Convert DB date fields to API-safe ISO strings. */
function serializeWorkout(
  w: {
    workoutId: number;
    userId: number;
    title: string;
    notes: string | null;
    exerciseTypeId: number | null;
    startedAt: Date;
    endedAt: Date | null;
    durationMinutes: number | null;
    createdAt: Date;
    updatedAt: Date;
    userWeight: string | null;
    reps: number | null;
  },
  unitSystem: UnitSystem,
): {
  workoutId: number;
  userId: number;
  title: string;
  notes: string | null;
  exerciseTypeId: number | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  userWeight: number | null;
  reps: number | null;
} {
  const storedPounds = w.userWeight != null ? Number(w.userWeight) : null;
  return {
    workoutId: w.workoutId,
    userId: w.userId,
    title: w.title,
    notes: w.notes,
    exerciseTypeId: w.exerciseTypeId,
    startedAt: w.startedAt.toISOString(),
    endedAt: w.endedAt ? w.endedAt.toISOString() : null,
    durationMinutes: w.durationMinutes,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
    userWeight: poundsToDisplayWeight(storedPounds, unitSystem),
    reps: w.reps,
  };
}

/** List workouts that belong to the authenticated user. */
export async function getWorkouts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const [rows, unitSystem] = await Promise.all([
      listWorkouts(userId),
      readUserUnitSystem(userId),
    ]);
    sendSuccess(
      res,
      rows.map((row) => serializeWorkout(row, unitSystem)),
    );
  } catch (err) {
    next(err);
  }
}

/** Create a user-owned workout with optional linked exercise. */
export async function postWorkout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const unitSystem = await readUserUnitSystem(userId);
    const body = createWorkoutBody.parse(req.body);
    // `endedAt` accepts either explicit null, omitted, or ISO string.
    const endedAt =
      body.endedAt === undefined
        ? undefined
        : body.endedAt === null
          ? null
          : new Date(body.endedAt);
    if (body.exerciseTypeId) {
      await assertExerciseAssignableToUser(userId, body.exerciseTypeId);
    }
    const created = await createWorkout(userId, {
      title: body.title,
      notes: body.notes,
      exerciseTypeId: body.exerciseTypeId,
      startedAt: body.startedAt ? new Date(body.startedAt) : undefined,
      endedAt,
      durationMinutes: body.durationMinutes,
      userWeight: String(displayWeightToPounds(body.userWeight, unitSystem)),
      reps: body.reps,
    });
    sendSuccess(res, serializeWorkout(created, unitSystem), 201);
  } catch (err) {
    next(err);
  }
}

/** Update a user-owned workout by identifier. */
export async function patchWorkout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const unitSystem = await readUserUnitSystem(userId);
    const { workoutId } = workoutIdParams.parse(req.params);
    const body = patchWorkoutBody.parse(req.body);
    // Preserve omitted field vs explicit null semantics.
    const endedAt =
      body.endedAt === undefined
        ? undefined
        : body.endedAt === null
          ? null
          : new Date(body.endedAt);
    if (body.exerciseTypeId) {
      await assertExerciseAssignableToUser(userId, body.exerciseTypeId);
    }
    const updated = await updateWorkout(userId, workoutId, {
      title: body.title,
      notes: body.notes,
      exerciseTypeId: body.exerciseTypeId,
      startedAt: body.startedAt ? new Date(body.startedAt) : undefined,
      endedAt,
      durationMinutes: body.durationMinutes,
      ...(body.userWeight !== undefined
        ? {
            userWeight: String(
              displayWeightToPounds(body.userWeight, unitSystem),
            ),
          }
        : {}),
      ...(body.reps !== undefined ? { reps: body.reps } : {}),
    });
    sendSuccess(res, serializeWorkout(updated, unitSystem));
  } catch (err) {
    next(err);
  }
}

/** Delete a user-owned workout by identifier. */
export async function removeWorkout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const { workoutId } = workoutIdParams.parse(req.params);
    await deleteWorkout(userId, workoutId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}
