import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
  };
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn(`Unauthenticated request block: ${req.method} ${req.url}`);
    res.status(401).json({ success: false, message: 'Authentication required: Token missing' });
    return;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret'
    ) as { userId: string; email: string; name: string };
    
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn(`Failed login check for request ${req.method} ${req.url}: invalid token`);
    res.status(403).json({ success: false, message: 'Access forbidden: Invalid or expired token' });
  }
};
