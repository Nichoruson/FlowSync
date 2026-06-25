import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request & { requestId?: string },
  res: Response,
  _next: NextFunction
): void => {
  // Zod validation error (should be caught by validate middleware, but just in case)
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      res.status(409).json({ success: false, message: 'A record with this value already exists' });
      return;
    }
    if (err.code === 'P2025') {
      // Record not found
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`${req.method} ${req.url} — ${message}`, {
    requestId: req.requestId,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
