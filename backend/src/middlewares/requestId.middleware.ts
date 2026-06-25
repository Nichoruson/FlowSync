import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Assigns a unique X-Request-ID header to every incoming request.
 * Re-uses the client-provided ID if present (for tracing across services).
 * This ID is available on req.requestId and returned in the response header.
 */
export const requestIdMiddleware = (
  req: Request & { requestId?: string },
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};
