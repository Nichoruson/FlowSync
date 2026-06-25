import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import { getIoInstance } from '../config/socket';
import logger from '../utils/logger';

// ----------------------------------------------------
// TASK CONTROLLERS
// ----------------------------------------------------

export const createTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { columnId, title, description, boardId, priority, dueDate, labels, assignedTo, attachments } = req.body;

  try {
    // Determine the position (append to the end: max position + 1000)
    const lastTask = await prisma.task.findFirst({
      where: { columnId },
      orderBy: { position: 'desc' },
    });

    const position = lastTask ? lastTask.position + 1000.0 : 1000.0;

    const task = await prisma.task.create({
      data: {
        columnId,
        title,
        description: description || null,
        position,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        labels: labels || [],
        attachments: attachments || [],
        assignees: {
          connect: assignedTo && assignedTo.length > 0 ? assignedTo.map((userId: string) => ({ id: userId })) : [],
        },
      },
      include: {
        assignees: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Real-time broadcast
    try {
      const io = getIoInstance();
      io.to(`board_${boardId}`).emit('task_created', { task, columnId });
    } catch (e) {
      logger.warn('Failed to broadcast task_created via Socket.io', e);
    }

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { title, description, assignedTo, boardId, priority, dueDate, labels, attachments } = req.body;

  try {
    const task = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        assignees: assignedTo === undefined ? undefined : {
          set: assignedTo ? assignedTo.map((userId: string) => ({ id: userId })) : [],
        },
        priority,
        dueDate: dueDate === undefined ? undefined : (dueDate ? new Date(dueDate) : null),
        labels: labels === undefined ? undefined : labels,
        attachments: attachments === undefined ? undefined : attachments,
        // Increment version on update
        version: { increment: 1 },
      },
      include: {
        assignees: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Real-time broadcast
    try {
      const io = getIoInstance();
      io.to(`board_${boardId}`).emit('task_updated', { task });
    } catch (e) {
      logger.warn('Failed to broadcast task_updated via Socket.io', e);
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

export const moveTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { newColumnId, newPosition, currentVersion, boardId } = req.body;

  try {
    const updatedTask = await prisma.$transaction(async (tx) => {
      // 1. Fetch current task state to verify version
      const existingTask = await tx.task.findUnique({
        where: { id },
      });

      if (!existingTask) {
        throw new Error('TaskNotFound');
      }

      // 2. Optimistic locking check
      if (existingTask.version !== currentVersion) {
        throw new Error('VersionConflict');
      }

      // 3. Perform position move and increment version
      return tx.task.update({
        where: { id },
        data: {
          columnId: newColumnId,
          position: newPosition,
          version: existingTask.version + 1,
        },
        include: {
          assignees: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });

    logger.info(`Task "${id}" moved to Column "${newColumnId}" position ${newPosition} by User ${req.user?.userId}`);

    // 4. Broadcast to other collaborators on the board
    try {
      const io = getIoInstance();
      io.to(`board_${boardId}`).emit('task_moved', {
        taskId: id,
        newColumnId,
        newPosition,
        version: updatedTask.version,
      });
    } catch (e) {
      logger.warn('Failed to broadcast task_moved via Socket.io', e);
    }

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error: any) {
    if (error.message === 'VersionConflict') {
      logger.warn(`Version conflict on task "${id}" update. Client sent ${currentVersion}.`);
      res.status(409).json({
        success: false,
        message: 'Conflict detected: This card has already been updated by another user.',
      });
      return;
    }
    if (error.message === 'TaskNotFound') {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }
    next(error);
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { boardId } = req.query;

  try {
    await prisma.task.delete({ where: { id } });

    // Real-time broadcast
    try {
      const io = getIoInstance();
      io.to(`board_${boardId as string}`).emit('task_deleted', { taskId: id });
    } catch (e) {
      logger.warn('Failed to broadcast task_deleted via Socket.io', e);
    }

    res.status(200).json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// COLUMN CONTROLLERS
// ----------------------------------------------------

export const createColumn = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { boardId, title } = req.body;

  try {
    // Determine the position (append to end: max position + 1000)
    const lastCol = await prisma.column.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
    });

    const position = lastCol ? lastCol.position + 1000.0 : 1000.0;

    const column = await prisma.column.create({
      data: {
        boardId,
        title,
        position,
      },
    });

    // Broadcast
    try {
      const io = getIoInstance();
      io.to(`board_${boardId}`).emit('column_created', { column });
    } catch (e) {
      logger.warn('Failed to broadcast column_created via Socket.io', e);
    }

    res.status(201).json({ success: true, data: column });
  } catch (error) {
    next(error);
  }
};

export const updateColumn = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { title, newPosition, boardId } = req.body;

  try {
    const column = await prisma.column.update({
      where: { id },
      data: {
        title: title === undefined ? undefined : title,
        position: newPosition === undefined ? undefined : newPosition,
      },
    });

    // Broadcast
    try {
      const io = getIoInstance();
      io.to(`board_${boardId}`).emit('column_updated', { column });
    } catch (e) {
      logger.warn('Failed to broadcast column_updated via Socket.io', e);
    }

    res.status(200).json({ success: true, data: column });
  } catch (error) {
    next(error);
  }
};

export const moveColumn = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { newPosition, boardId } = req.body;

  try {
    const column = await prisma.column.update({
      where: { id },
      data: { position: newPosition },
    });

    // Broadcast
    try {
      const io = getIoInstance();
      io.to(`board_${boardId}`).emit('column_moved', {
        columnId: id,
        newPosition,
      });
    } catch (e) {
      logger.warn('Failed to broadcast column_moved via Socket.io', e);
    }

    res.status(200).json({ success: true, data: column });
  } catch (error) {
    next(error);
  }
};

export const deleteColumn = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { boardId } = req.query;

  try {
    await prisma.column.delete({ where: { id } });

    // Broadcast
    try {
      const io = getIoInstance();
      io.to(`board_${boardId as string}`).emit('column_deleted', { columnId: id });
    } catch (e) {
      logger.warn('Failed to broadcast column_deleted via Socket.io', e);
    }

    res.status(200).json({ success: true, message: 'Column deleted successfully' });
  } catch (error) {
    next(error);
  }
};
