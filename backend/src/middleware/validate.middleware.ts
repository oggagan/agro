import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { sendError } from '../utils/api-response.js';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = (result.error as any).issues ?? (result.error as any).errors ?? [];
      const details = issues.map((e: any) => ({
        field: e.path?.join('.') ?? '',
        message: e.message ?? 'Validation error',
      }));
      sendError({
        res,
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        details,
      });
      return;
    }
    // In Express v5, req.query and req.params are read-only getters.
    // Only assign back for req.body which is writable.
    if (source === 'body') {
      req.body = result.data;
    }
    next();
  };
}
