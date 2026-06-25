import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

interface DecodedToken {
  userId: string;
  email: string;
  name: string;
}

// boardId -> Map<socketId, userInfo>
const boardPresence = new Map<string, Map<string, { userId: string; name: string; email: string }>>();

let io: Server;

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const cleanupPresence = (boardId: string, socketId: string): void => {
  const boardMap = boardPresence.get(boardId);
  if (!boardMap) return;
  boardMap.delete(socketId);
  if (boardMap.size === 0) {
    boardPresence.delete(boardId);
  }
};

const broadcastPresence = (boardId: string): void => {
  const boardMap = boardPresence.get(boardId);
  const onlineUsers = boardMap ? Array.from(boardMap.values()) : [];
  io.to(`board_${boardId}`).emit('board_presence', { boardId, onlineUsers });
};

export const initSocketServer = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: (process.env.CLIENT_URL || 'http://localhost:5173')
        .split(',')
        .map((o) => o.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    // Allow both websocket and polling for broader compatibility
    transports: ['websocket', 'polling'],
  });

  // ── JWT auth middleware ──────────────────────────────────────────────────
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers['authorization'] as string | undefined);

    if (!token) {
      return next(new Error('Authentication failed: Token missing'));
    }

    try {
      const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.verify(raw, process.env.JWT_SECRET!) as DecodedToken;
      socket.data.user = decoded;
      // Track which boards this socket has joined (supports multiple tabs)
      socket.data.joinedBoards = new Set<string>();
      next();
    } catch {
      next(new Error('Authentication failed: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as DecodedToken;
    logger.info(`Socket connected: ${socket.id} (${user.name})`);

    // ── Join board room ────────────────────────────────────────────────────
    socket.on('join_board', (boardId: string) => {
      if (!UUID_REGEX.test(boardId)) {
        socket.emit('error', { message: 'Invalid Board ID format' });
        return;
      }

      const room = `board_${boardId}`;
      socket.join(room);

      // Track in per-socket joined set
      (socket.data.joinedBoards as Set<string>).add(boardId);

      // Register in global presence map
      if (!boardPresence.has(boardId)) {
        boardPresence.set(boardId, new Map());
      }
      boardPresence.get(boardId)!.set(socket.id, {
        userId: user.userId,
        name: user.name,
        email: user.email,
      });

      broadcastPresence(boardId);
      logger.debug(`${user.name} joined board room: ${room}`);
    });

    // ── Leave board room ───────────────────────────────────────────────────
    socket.on('leave_board', (boardId: string) => {
      const room = `board_${boardId}`;
      socket.leave(room);
      (socket.data.joinedBoards as Set<string>).delete(boardId);
      cleanupPresence(boardId, socket.id);
      broadcastPresence(boardId);
      logger.debug(`${user.name} left board room: ${room}`);
    });

    // ── Visual drag lock ───────────────────────────────────────────────────
    socket.on('task_dragging', (data: { boardId: string; taskId: string; isDragging: boolean }) => {
      if (!UUID_REGEX.test(data.boardId) || !UUID_REGEX.test(data.taskId)) return;
      socket.to(`board_${data.boardId}`).emit('task_locked', {
        taskId: data.taskId,
        lockedBy: user.userId,
        userName: user.name,
        isLocked: data.isDragging,
      });
    });

    // ── Board metadata changes (rename / delete) ──────────────────────────
    socket.on('board_meta_changed', (data: { boardId: string; type: 'renamed' | 'deleted'; title?: string }) => {
      if (!UUID_REGEX.test(data.boardId)) return;
      socket.to(`board_${data.boardId}`).emit('board_meta_changed', {
        boardId: data.boardId,
        type: data.type,
        title: data.title,
      });
    });

    // ── Disconnect — clean up ALL joined boards ────────────────────────────
    socket.on('disconnect', () => {
      const joinedBoards = socket.data.joinedBoards as Set<string>;
      joinedBoards.forEach((boardId) => {
        cleanupPresence(boardId, socket.id);
        broadcastPresence(boardId);
      });
      logger.info(`Socket disconnected: ${socket.id} (${user.name})`);
    });
  });

  return io;
};

export const getIoInstance = (): Server => {
  if (!io) throw new Error('Socket.io server is not initialized');
  return io;
};
