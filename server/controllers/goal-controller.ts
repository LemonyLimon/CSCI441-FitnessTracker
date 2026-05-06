import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '@server/lib/http-response.js';
import { requireUserId } from '@server/lib/request-user.js';
import {
  createGoal,
  deleteGoal,
  listGoals,
  updateGoal,
} from '@server/services/goal-service.js';

const goalIdParams = z.object({
  goalId: z.coerce.number().int().positive(),
});

const intervalLike = z
  .string()
  .regex(/^\d{2}:\d{2}:\d{2}$/, 'targetTime must be HH:MM:SS')
  .nullable();

const createGoalBody = z
  .object({
    exerciseType: z.coerce.number().int().positive().nullable().optional(),
    targetWeight: z.coerce.number().positive().nullable().optional(),
    targetTime: intervalLike.optional(),
    targetDistance: z.coerce.number().positive().nullable().optional(),
  })
  .refine(
    (body) =>
      body.targetWeight != null ||
      body.targetTime != null ||
      body.targetDistance != null,
    { message: 'at least one target field is required' },
  );

const patchGoalBody = z.object({
  exerciseType: z.coerce.number().int().positive().nullable().optional(),
  targetWeight: z.coerce.number().positive().nullable().optional(),
  targetTime: intervalLike.optional(),
  targetDistance: z.coerce.number().positive().nullable().optional(),
});

function toDecimalString(
  value: number | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return String(value);
}

function serializeGoal(g: {
  goalId: number;
  userId: number;
  targetWeight: string | null;
  exerciseType: number | null;
  targetTime: string | null;
  targetDistance: string | null;
}): {
  goalId: number;
  userId: number;
  exerciseType: number | null;
  targetWeight: string | null;
  targetTime: string | null;
  targetDistance: string | null;
} {
  return {
    goalId: g.goalId,
    userId: g.userId,
    exerciseType: g.exerciseType,
    targetWeight: g.targetWeight,
    targetTime: g.targetTime,
    targetDistance: g.targetDistance,
  };
}

/** GET /api/me/goals */
export async function getGoals(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);

    const rows = await listGoals(authUserId);
    sendSuccess(
      res,
      rows.map((row) => serializeGoal(row)),
    );
  } catch (err) {
    next(err);
  }
}

/** POST /api/me/goals */
export async function postGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);

    const body = createGoalBody.parse(req.body);
    const created = await createGoal(authUserId, {
      exerciseType: body.exerciseType,
      targetWeight: toDecimalString(body.targetWeight),
      targetTime: body.targetTime,
      targetDistance: toDecimalString(body.targetDistance),
    });
    sendSuccess(res, serializeGoal(created), 201);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/me/goals/:goalId */
export async function patchGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);
    const { goalId } = goalIdParams.parse(req.params);

    const body = patchGoalBody.parse(req.body);
    const updated = await updateGoal(authUserId, goalId, {
      exerciseType: body.exerciseType,
      targetWeight: toDecimalString(body.targetWeight),
      targetTime: body.targetTime,
      targetDistance: toDecimalString(body.targetDistance),
    });
    sendSuccess(res, serializeGoal(updated));
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/me/goals/:goalId */
export async function removeGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);
    const { goalId } = goalIdParams.parse(req.params);

    await deleteGoal(authUserId, goalId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}
