import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '@server/lib/http-response.js';
import { requireUserId } from '@server/lib/request-user.js';
import { assertExerciseAssignableToUser } from '@server/services/exercise-type-service.js';
import {
  createExercise,
  deleteExercise,
  listWorkoutExercises,
  updateExercise,
} from '@server/services/exercise-service.js';

const exerciseIdParams = z.object({
  exerciseId: z.coerce.number().int().positive(),
});

const listExerciseQuery = z.object({
  workoutId: z.coerce.number().int().positive(),
});

/** Postgres interval fields accept `HH:MM:SS` strings in request JSON. */
const intervalLike = z
  .string()
  .regex(/^\d{2}:\d{2}:\d{2}$/, 'interval fields must be HH:MM:SS')
  .nullable();

const createExerciseBody = z.object({
  workoutId: z.coerce.number().int().positive(),
  type: z.coerce.number().int().positive(),
  sets: z.coerce.number().int().nonnegative().nullable().optional(),
  reps: z.coerce.number().int().nonnegative().nullable().optional(),
  weights: z.coerce.number().positive().nullable().optional(),
  duration: intervalLike.optional(),
  distance: z.coerce.number().positive().nullable().optional(),
  restTime: intervalLike.optional(),
});

const patchExerciseBody = z.object({
  type: z.coerce.number().int().positive().optional(),
  sets: z.coerce.number().int().nonnegative().nullable().optional(),
  reps: z.coerce.number().int().nonnegative().nullable().optional(),
  weights: z.coerce.number().positive().nullable().optional(),
  duration: intervalLike.optional(),
  distance: z.coerce.number().positive().nullable().optional(),
  restTime: intervalLike.optional(),
});

function toDecimalString(
  value: number | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return String(value);
}

function serializeExercise(e: {
  exerciseId: number;
  workoutId: number;
  type: number;
  sets: number | null;
  reps: number | null;
  weights: string | null;
  duration: string | null;
  distance: string | null;
  restTime: string | null;
}): {
  exerciseId: number;
  workoutId: number;
  type: number;
  sets: number | null;
  reps: number | null;
  weights: string | null;
  duration: string | null;
  distance: string | null;
  restTime: string | null;
} {
  return {
    exerciseId: e.exerciseId,
    workoutId: e.workoutId,
    type: e.type,
    sets: e.sets,
    reps: e.reps,
    weights: e.weights,
    duration: e.duration,
    distance: e.distance,
    restTime: e.restTime,
  };
}

export async function getExercises(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const { workoutId } = listExerciseQuery.parse(req.query);
    const rows = await listWorkoutExercises(userId, workoutId);
    sendSuccess(
      res,
      rows.map((row) => serializeExercise(row)),
    );
  } catch (err) {
    next(err);
  }
}

export async function postExercise(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const body = createExerciseBody.parse(req.body);
    await assertExerciseAssignableToUser(userId, body.type);
    const created = await createExercise(userId, {
      workoutId: body.workoutId,
      type: body.type,
      sets: body.sets,
      reps: body.reps,
      weights: toDecimalString(body.weights),
      duration: body.duration,
      distance: toDecimalString(body.distance),
      restTime: body.restTime,
    });
    sendSuccess(res, serializeExercise(created), 201);
  } catch (err) {
    next(err);
  }
}

export async function patchExercise(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const { exerciseId } = exerciseIdParams.parse(req.params);
    const body = patchExerciseBody.parse(req.body);
    if (body.type !== undefined) {
      await assertExerciseAssignableToUser(userId, body.type);
    }
    const updated = await updateExercise(userId, exerciseId, {
      type: body.type,
      sets: body.sets,
      reps: body.reps,
      weights: toDecimalString(body.weights),
      duration: body.duration,
      distance: toDecimalString(body.distance),
      restTime: body.restTime,
    });
    sendSuccess(res, serializeExercise(updated));
  } catch (err) {
    next(err);
  }
}

export async function removeExercise(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const { exerciseId } = exerciseIdParams.parse(req.params);
    await deleteExercise(userId, exerciseId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}
