import { Response } from 'express';

interface SuccessOptions<T> {
  res: Response;
  data?: T;
  message?: string;
  statusCode?: number;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ErrorOptions {
  res: Response;
  statusCode?: number;
  code?: string;
  message?: string;
  details?: Array<{ field: string; message: string }>;
}

export function sendSuccess<T>({
  res,
  data = {} as T,
  message = 'Success',
  statusCode = 200,
  meta,
}: SuccessOptions<T>): void {
  const response: Record<string, unknown> = {
    success: true,
    data,
    message,
  };
  if (meta) response.meta = meta;
  res.status(statusCode).json(response);
}

export function sendError({
  res,
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  message = 'Something went wrong',
  details,
}: ErrorOptions): void {
  const error: Record<string, unknown> = { code, message };
  if (details) error.details = details;
  res.status(statusCode).json({ success: false, error });
}
