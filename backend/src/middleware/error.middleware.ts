import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.js';
import { sendError } from '../utils/api-response.js';

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error(err);

  if (err instanceof AppError) {
    sendError({
      res,
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
    });
    return;
  }

  // Prisma known errors
  if ((err as any).code === 'P2002') {
    const target = (err as any).meta?.target;
    sendError({
      res,
      statusCode: 409,
      code: 'UNIQUE_CONSTRAINT',
      message: `A record with this ${Array.isArray(target) ? target.join(', ') : 'value'} already exists.`,
    });
    return;
  }

  if ((err as any).code === 'P2025') {
    sendError({
      res,
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Record not found.',
    });
    return;
  }

  sendError({
    res,
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error.',
  });
}
