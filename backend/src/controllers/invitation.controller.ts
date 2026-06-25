import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import { sendInvitationEmail } from '../utils/mailer';
import { v4 as uuidv4 } from 'uuid';
import { getIoInstance } from '../config/socket';
import logger from '../utils/logger';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

export const createInvitation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id: boardId } = req.params;
  const { email } = req.body;
  const inviterId = req.user?.userId;

  try {
    if (!inviterId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // 1. Get board and inviter info
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      res.status(404).json({ success: false, message: 'Board not found' });
      return;
    }

    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { name: true },
    });

    if (!inviter) {
      res.status(404).json({ success: false, message: 'Inviter user not found' });
      return;
    }

    // 2. Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      const existingMember = await prisma.boardMember.findUnique({
        where: {
          boardId_userId: {
            boardId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        res.status(400).json({ success: false, message: `${email} is already a member of this board` });
        return;
      }
    }

    // 3. Delete any previous pending invitation for this email on this board
    await prisma.invitation.deleteMany({
      where: {
        boardId,
        email: email.trim().toLowerCase(),
        status: 'PENDING',
      },
    });

    // 4. Create new invitation
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const invitation = await prisma.invitation.create({
      data: {
        boardId,
        email: email.trim().toLowerCase(),
        token,
        invitedBy: inviter.name,
        expiresAt,
      },
    });

    // 5. Send email
    const inviteUrl = `${CLIENT_URL}/#/accept-invite?token=${token}`;
    await sendInvitationEmail(
      email.trim().toLowerCase(),
      board.title,
      inviteUrl,
      inviter.name
    );

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInvitation = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  const { token } = req.params;

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        board: {
          select: { title: true },
        },
      },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      res.status(404).json({ success: false, message: 'Invitation not found or no longer pending' });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      res.status(400).json({ success: false, message: 'Invitation has expired' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        email: invitation.email,
        boardTitle: invitation.board.title,
        invitedBy: invitation.invitedBy,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const respondToInvitation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { token } = req.params;
  const { action } = req.body;
  const userId = req.user?.userId;

  try {
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // 1. Fetch invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      res.status(404).json({ success: false, message: 'Invitation not found or no longer pending' });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      res.status(400).json({ success: false, message: 'Invitation has expired' });
      return;
    }

    // 2. Security Check: Verify authenticated user's email matches the invitation email
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      res.status(403).json({
        success: false,
        message: `This invitation was sent to ${invitation.email}, but you are logged in as ${user.email}. Please log in with the invited account.`,
      });
      return;
    }

    // 3. Process action
    if (action === 'DECLINE') {
      await prisma.invitation.update({
        where: { token },
        data: { status: 'DECLINED' },
      });

      res.status(200).json({ success: true, message: 'Invitation declined successfully' });
      return;
    }

    // action === 'ACCEPT'
    // Check if already a member (safety fallback)
    const existingMember = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: invitation.boardId,
          userId,
        },
      },
    });

    if (existingMember) {
      await prisma.invitation.update({
        where: { token },
        data: { status: 'ACCEPTED' },
      });
      res.status(200).json({ success: true, message: 'You are already a member of this board' });
      return;
    }

    // Add user as member + update invitation status in transaction
    const membership = await prisma.$transaction(async (tx) => {
      const mem = await tx.boardMember.create({
        data: {
          boardId: invitation.boardId,
          userId,
          role: invitation.role,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.invitation.update({
        where: { token },
        data: { status: 'ACCEPTED' },
      });

      return mem;
    });

    logger.info(`User ${user.email} accepted invitation to board ${invitation.boardId}`);

    // Broadcast member added to room
    try {
      const io = getIoInstance();
      io.to(`board_${invitation.boardId}`).emit('member_added', {
        boardId: invitation.boardId,
        member: {
          boardId: invitation.boardId,
          userId: membership.userId,
          role: membership.role,
          user: membership.user,
        },
      });
    } catch (e) {
      logger.warn('Failed to broadcast member_added via Socket.io', e);
    }

    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        boardId: invitation.boardId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingInvitations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id: boardId } = req.params;
  const requesterId = req.user?.userId;

  try {
    if (!requesterId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Verify membership
    const membership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: requesterId } },
    });

    if (!membership) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const invites = await prisma.invitation.findMany({
      where: {
        boardId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        invitedBy: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: invites });
  } catch (error) {
    next(error);
  }
};

export const revokeInvitation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id: boardId, inviteId } = req.params;
  const requesterId = req.user?.userId;

  try {
    if (!requesterId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Verify requester has OWNER/ADMIN role
    const requesterMembership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: requesterId } },
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      res.status(403).json({ success: false, message: 'Only board owners and admins can manage invitations' });
      return;
    }

    await prisma.invitation.deleteMany({
      where: {
        id: inviteId,
        boardId,
      },
    });

    res.status(200).json({ success: true, message: 'Invitation revoked successfully' });
  } catch (error) {
    next(error);
  }
};
