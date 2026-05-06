import { Response } from 'express';
import {
  type ApiErrorBody,
  type ApiErrorEnvelope,
  type ApiMeta,
  type ApiSuccessEnvelope,
} from '@shared/api-contracts';

/**
 * Read request ID from response header for API metadata.
 */
function getResponseMeta(res: Response): ApiMeta {
  const requestIdHeader = res.getHeader('x-request-id');
  const requestId: string | undefined =
    typeof requestIdHeader === 'string' ? requestIdHeader : undefined;
  return {
    requestId,
  };
}

/**
 * Send a success API envelope.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  status: number = 200,
): void {
  const payload: ApiSuccessEnvelope<T> = {
    data,
    meta: getResponseMeta(res),
  };
  res.status(status).json(payload);
}

/**
 * Send an error API envelope.
 */
export function sendError(
  res: Response,
  status: number,
  error: ApiErrorBody,
): void {
  const payload: ApiErrorEnvelope = {
    error,
    meta: getResponseMeta(res),
  };
  res.status(status).json(payload);
}
