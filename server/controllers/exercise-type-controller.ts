import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '@server/lib/http-response.js';
import { requireUserId } from '@server/lib/request-user.js';
import {
  createCustomExercise,
  deleteCustomExercise,
  listExercises,
  updateCustomExercise,
} from '@server/services/exercise-type-service.js';

/** Route param parser for `:exerciseTypeId`. */
const exerciseTypeIdParams = z.object({
  exerciseTypeId: z.coerce.number().int().positive(),
});

const createExerciseBody = z.object({
  name: z.string().trim().min(1).max(120),
  muscleGroup: z.string().trim().max(120).nullable().optional(),
  category: z.enum(['resistance', 'cardio', 'flexibility']).optional(),
});

const patchExerciseBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  muscleGroup: z.string().trim().max(120).nullable().optional(),
  category: z.enum(['resistance', 'cardio', 'flexibility']).optional(),
});

/** Convert exercise rows to API response shape. */
function serializeExercise(e: {
  exerciseTypeId: number;
  userId: number | null;
  name: string;
  muscleGroup: string | null;
  category: string;
  createdAt: Date;
}): {
  exerciseTypeId: number;
  userId: number | null;
  isCustom: boolean;
  name: string;
  muscleGroup: string | null;
  category: string;
  createdAt: string;
} {
  return {
    exerciseTypeId: e.exerciseTypeId,
    userId: e.userId,
    isCustom: e.userId !== null,
    name: e.name,
    muscleGroup: e.muscleGroup,
    category: e.category,
    createdAt: e.createdAt.toISOString(),
  };
}

/** Return seeded + caller-owned custom exercises. */
export async function getExercises(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await listExercises(requireUserId(req));
    sendSuccess(
      res,
      rows.map((row) => serializeExercise(row)),
    );
  } catch (err) {
    next(err);
  }
}

/** Create a custom exercise owned by the authenticated user. */
export async function postExercise(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const body = createExerciseBody.parse(req.body);
    const row = await createCustomExercise(userId, body);
    sendSuccess(res, serializeExercise(row), 201);
  } catch (err) {
    next(err);
  }
}

/** Update a caller-owned custom exercise. */
export async function patchExercise(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const { exerciseTypeId } = exerciseTypeIdParams.parse(req.params);
    const body = patchExerciseBody.parse(req.body);
    const row = await updateCustomExercise(userId, exerciseTypeId, body);
    sendSuccess(res, serializeExercise(row));
  } catch (err) {
    next(err);
  }
}

/** Delete a caller-owned custom exercise. */
export async function removeExercise(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const { exerciseTypeId } = exerciseTypeIdParams.parse(req.params);
    await deleteCustomExercise(userId, exerciseTypeId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}
