import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import prisma from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
  };
  requestId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET!;

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn(`Unauthenticated request: ${req.method} ${req.url}`);
    res.status(401).json({ success: false, message: 'Authentication required: Token missing' });
    return;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      name: string;
    };
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn(`Invalid token on ${req.method} ${req.url}`);
    res.status(401).json({ success: false, message: 'Access denied: Invalid or expired token' });
  }
};

/**
 * Middleware factory that verifies the authenticated user is a member of a board.
 * Extracts boardId from body, params, or query (in that order).
 */
export const requireBoardMember = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.userId;
    const boardId =
      req.body?.boardId ||
      req.params?.boardId ||
      req.params?.id ||
      req.query?.boardId;

    if (!userId || !boardId) {
      res.status(400).json({ success: false, message: 'boardId is required' });
      return;
    }

    try {
      const membership = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId: boardId as string, userId } },
      });

      if (!membership) {
        res.status(403).json({ success: false, message: 'Access denied: Not a member of this board' });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware factory that restricts access to users with the given roles on a board.
 */
export const requireBoardRole = (roles: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.userId;
    const boardId =
      req.body?.boardId ||
      req.params?.boardId ||
      req.params?.id ||
      req.query?.boardId;

    if (!userId || !boardId) {
      res.status(400).json({ success: false, message: 'boardId is required' });
      return;
    }

    try {
      const membership = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId: boardId as string, userId } },
      });

      if (!membership || !roles.includes(membership.role)) {
        res.status(403).json({
          success: false,
          message: `Access denied: Requires one of [${roles.join(', ')}] role`,
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
