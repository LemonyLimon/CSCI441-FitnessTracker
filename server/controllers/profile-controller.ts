import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess } from '@server/lib/http-response.js';
import { requireUserId } from '@server/lib/request-user.js';
import { userRowToSessionUser } from '@server/services/auth-service.js';
import {
  createUserProfile,
  replaceUserProfile,
  resetUserProfile,
  updateUserProfile,
} from '@server/services/profile-service.js';

const createProfileBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().nullable().optional(),
  password: z.string().min(8).max(200).optional(),
  height: z.coerce.number().int().positive().max(300).nullable().optional(),
  payment_info: z.string().trim().max(255).nullable().optional(),
});

const putProfileBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().nullable().optional(),
  password: z.string().min(8).max(200).optional(),
  height: z.coerce.number().int().positive().max(300).nullable().optional(),
  payment_info: z.string().trim().max(255).nullable().optional(),
});

const patchProfileBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().nullable().optional(),
  password: z.string().min(8).max(200).optional(),
  height: z.coerce.number().int().positive().max(300).nullable().optional(),
  payment_info: z.string().trim().max(255).nullable().optional(),
});

function bodyToServiceInput(body: {
  name?: string;
  email?: string | null;
  password?: string;
  height?: number | null;
  payment_info?: string | null;
}): {
  displayName?: string;
  email?: string | null;
  passwordPlain?: string;
  height?: number | null;
  paymentInfo?: string | null;
} {
  return {
    ...(body.name !== undefined ? { displayName: body.name } : {}),
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.password !== undefined ? { passwordPlain: body.password } : {}),
    ...(body.height !== undefined ? { height: body.height } : {}),
    ...(body.payment_info !== undefined
      ? { paymentInfo: body.payment_info }
      : {}),
  };
}

/** POST /api/me/profile */
export async function postUserProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);

    const body = createProfileBody.parse(req.body);
    const row = await createUserProfile(authUserId, {
      displayName: body.name,
      email: body.email,
      passwordPlain: body.password,
      height: body.height,
      paymentInfo: body.payment_info,
    });
    sendSuccess(res, userRowToSessionUser(row), 201);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/me/profile */
export async function putUserProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);

    const body = putProfileBody.parse(req.body);
    const row = await replaceUserProfile(authUserId, {
      displayName: body.name,
      email: body.email,
      passwordPlain: body.password,
      height: body.height,
      paymentInfo: body.payment_info,
    });
    sendSuccess(res, userRowToSessionUser(row));
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/me/profile */
export async function patchUserProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);

    const body = patchProfileBody.parse(req.body);
    const row = await updateUserProfile(authUserId, bodyToServiceInput(body));
    sendSuccess(res, userRowToSessionUser(row));
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/me/profile — clears optional profile fields (not account deletion). */
export async function resetProfileFields(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUserId = requireUserId(req);

    await resetUserProfile(authUserId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}
