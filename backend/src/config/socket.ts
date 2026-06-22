import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

interface DecodedToken {
  userId: string;
  email: string;
  name: string;
}

// Track who is online per board: boardId -> Map<socketId, userInfo>
const boardPresence = new Map<string, Map<string, { userId: string; name: string; email: string }>>();

let io: Server;

export const initSocketServer = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    },
    pingTimeout: 60000,
  });

  // JWT auth middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('Authentication failed: Token missing'));
    }

    try {
      const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.verify(actualToken, process.env.JWT_SECRET || 'fallback_secret') as DecodedToken;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication failed: Invalid credentials'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as DecodedToken;
    logger.info(`Socket connected: ${socket.id} (${user.name} / ${user.userId})`);

    // Join board room — adds user to presence map and broadcasts
    socket.on('join_board', (boardId: string) => {
      const uuidRegex = /^[0-9a-fA-F-]{36}$/;
      if (!uuidRegex.test(boardId)) {
        socket.emit('error', 'Invalid Board Room ID');
        return;
      }

      const room = `board_${boardId}`;
      socket.join(room);
      socket.data.currentBoardId = boardId;

      // Register in presence map
      if (!boardPresence.has(boardId)) {
        boardPresence.set(boardId, new Map());
      }
      boardPresence.get(boardId)!.set(socket.id, {
        userId: user.userId,
        name: user.name,
        email: user.email,
      });

      // Broadcast updated presence list to everyone in the room
      const onlineUsers = Array.from(boardPresence.get(boardId)!.values());
      io.to(room).emit('board_presence', { boardId, onlineUsers });

      logger.info(`${user.name} joined board room: ${room}`);
    });

    // Leave board room
    socket.on('leave_board', (boardId: string) => {
      const room = `board_${boardId}`;
      socket.leave(room);

      // Remove from presence
      if (boardPresence.has(boardId)) {
        boardPresence.get(boardId)!.delete(socket.id);
        const onlineUsers = Array.from(boardPresence.get(boardId)!.values());
        io.to(room).emit('board_presence', { boardId, onlineUsers });
      }

      logger.info(`${user.name} left board room: ${room}`);
    });

    // Visual dragging lock - broadcasts card-lock state to collaborators
    socket.on('task_dragging', (data: { boardId: string; taskId: string; isDragging: boolean }) => {
      socket.to(`board_${data.boardId}`).emit('task_locked', {
        taskId: data.taskId,
        lockedBy: user.userId,
        userName: user.name,
        isLocked: data.isDragging,
      });
    });

    // Handle disconnect - clean up presence across all rooms
    socket.on('disconnect', () => {
      const boardId = socket.data.currentBoardId;
      if (boardId && boardPresence.has(boardId)) {
        boardPresence.get(boardId)!.delete(socket.id);
        const onlineUsers = Array.from(boardPresence.get(boardId)!.values());
        io.to(`board_${boardId}`).emit('board_presence', { boardId, onlineUsers });
      }
      logger.info(`Socket disconnected: ${socket.id} (${user.name})`);
    });
  });

  return io;
};

export const getIoInstance = (): Server => {
  if (!io) {
    throw new Error('Socket.io server is not initialized');
  }
  return io;
};
