import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import { getIoInstance } from '../config/socket';
import logger from '../utils/logger';

export const createBoard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { title } = req.body;
  const userId = req.user?.userId;

  if (!title || !userId) {
    res.status(400).json({ success: false, message: 'Board title is required' });
    return;
  }

  try {
    // Create Board + Member record in a single transaction
    const board = await prisma.$transaction(async (tx) => {
      const newBoard = await tx.board.create({
        data: {
          title,
          ownerId: userId,
        },
      });

      await tx.boardMember.create({
        data: {
          boardId: newBoard.id,
          userId,
          role: 'OWNER',
        },
      });

      // Seed with default Columns (To Do, In Progress, Done)
      await tx.column.createMany({
        data: [
          { boardId: newBoard.id, title: 'To Do', position: 1000.0 },
          { boardId: newBoard.id, title: 'In Progress', position: 2000.0 },
          { boardId: newBoard.id, title: 'Done', position: 3000.0 },
        ],
      });

      return newBoard;
    });

    logger.info(`Board created: "${title}" (${board.id}) by User ${userId}`);

    res.status(201).json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

export const getBoards = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    // Get all boards where user is a member
    const memberships = await prisma.boardMember.findMany({
      where: { userId },
      include: {
        board: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            ownerId: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const boards = memberships.map((m) => m.board);

    res.status(200).json({
      success: true,
      data: boards,
    });
  } catch (error) {
    next(error);
  }
};

export const getBoardById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    // 1. Check membership
    const member = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: id,
          userId,
        },
      },
    });

    if (!member) {
      res.status(403).json({ success: false, message: 'Access denied: You are not a member of this board' });
      return;
    }

    // 2. Fetch Board, Columns, and Tasks sorted by position
    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ success: false, message: 'Board not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------
// COLLABORATION: Invite / Remove Members
// -------------------------------------------------------

export const inviteMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id: boardId } = req.params;
  const { email } = req.body;
  const requesterId = req.user?.userId;

  if (!email) {
    res.status(400).json({ success: false, message: 'Email address is required' });
    return;
  }

  try {
    // 1. Verify requester is a board member with OWNER or ADMIN role
    const requesterMembership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: requesterId! } },
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      res.status(403).json({ success: false, message: 'Only board owners and admins can invite members' });
      return;
    }

    // 2. Find the user to invite by email
    const userToInvite = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!userToInvite) {
      res.status(404).json({ success: false, message: `No user found with email: ${email}` });
      return;
    }

    // 3. Check if already a member
    const existing = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: userToInvite.id } },
    });

    if (existing) {
      res.status(400).json({ success: false, message: `${userToInvite.name} is already a member of this board` });
      return;
    }

    // 4. Add as member
    const membership = await prisma.boardMember.create({
      data: { boardId, userId: userToInvite.id, role: 'MEMBER' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    logger.info(`User ${userToInvite.email} invited to board ${boardId} by ${requesterId}`);

    // 5. Broadcast to all board room members
    try {
      const io = getIoInstance();
      io.to(`board_${boardId}`).emit('member_added', {
        boardId,
        member: { boardId, userId: membership.userId, role: membership.role, user: membership.user },
      });
    } catch (e) { /* Socket not required for operation */ }

    res.status(201).json({ success: true, data: membership });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id: boardId, userId: targetUserId } = req.params;
  const requesterId = req.user?.userId;

  try {
    // 1. Only OWNER can remove others, any member can remove themselves
    const requesterMembership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: requesterId! } },
    });

    const isOwner = requesterMembership?.role === 'OWNER';
    const isSelf = requesterId === targetUserId;

    if (!isOwner && !isSelf) {
      res.status(403).json({ success: false, message: 'Only the board owner can remove other members' });
      return;
    }

    // 2. Cannot remove the board owner
    const targetMembership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: targetUserId } },
    });

    if (targetMembership?.role === 'OWNER') {
      res.status(400).json({ success: false, message: 'The board owner cannot be removed' });
      return;
    }

    await prisma.boardMember.delete({
      where: { boardId_userId: { boardId, userId: targetUserId } },
    });

    logger.info(`User ${targetUserId} removed from board ${boardId} by ${requesterId}`);

    // 3. Broadcast removal
    try {
      const io = getIoInstance();
      io.to(`board_${boardId}`).emit('member_removed', { boardId, userId: targetUserId });
    } catch (e) { /* Socket not required for operation */ }

    res.status(200).json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMembers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id: boardId } = req.params;
  const userId = req.user?.userId;

  try {
    // Verify membership
    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: userId! } },
    });

    if (!member) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const members = await prisma.boardMember.findMany({
      where: { boardId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.status(200).json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
};
