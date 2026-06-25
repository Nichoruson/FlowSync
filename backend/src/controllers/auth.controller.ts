import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '_refresh');

const generateTokens = async (user: { id: string; email: string; name: string }, res: Response) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Store in DB
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  // Set HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Lax works better for typical cross-origin OAuth/auth setups than Strict, but strict is fine if same site. Let's use 'lax' to be safe.
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password, name } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    const { accessToken } = await generateTokens(user, res);

    logger.info(`User registered successfully: ${user.email} (${user.id})`);

    res.status(201).json({
      success: true,
      data: {
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const { accessToken } = await generateTokens(user, res);

    logger.info(`User logged in successfully: ${user.email}`);

    res.status(200).json({
      success: true,
      data: {
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    res.status(401).json({ success: false, message: 'Refresh token missing' });
    return;
  }

  try {
    // 1. Verify token signature
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };

    // 2. Look up in DB
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!dbToken) {
      res.status(401).json({ success: false, message: 'Refresh token invalid' });
      return;
    }

    if (dbToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({ where: { id: dbToken.id } });
      res.status(401).json({ success: false, message: 'Refresh token expired' });
      return;
    }

    // 3. Refresh token rotation: delete used token
    try {
      await prisma.refreshToken.delete({ where: { id: dbToken.id } });
    } catch (err) {
      logger.warn('Refresh token already deleted, concurrent requests suspected', { tokenId: dbToken.id });
      res.status(401).json({ success: false, message: 'Refresh token invalid' });
      return;
    }

    // 4. Generate new tokens
    const user = dbToken.user;
    const { accessToken } = await generateTokens(user, res);

    res.status(200).json({
      success: true,
      data: {
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    logger.warn('Refresh token verification failed', error);
    res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  try {
    if (refreshToken) {
      // Remove from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.user.userId;
  const { name, currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const updateData: any = {};

    if (name) {
      updateData.name = name;
    }

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ success: false, message: 'Current password is required to set a new password' });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Incorrect current password' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true },
    });

    logger.info(`Profile updated for user: ${updatedUser.email}`);

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
