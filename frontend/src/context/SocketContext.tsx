import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useBoardStore } from '../store/boardStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface OnlineUser {
  userId: string;
  name: string;
  email: string;
}

interface TaskLock {
  taskId: string;
  lockedBy: string;
  userName: string;
  isLocked: boolean;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface SocketContextType {
  socket: Socket | null;
  lockedTasks: Record<string, { lockedBy: string; userName: string }>;
  onlineUsers: OnlineUser[];
  toasts: Toast[];
  dismissToast: (id: string) => void;
  emitDraggingState: (boardId: string, taskId: string, isDragging: boolean) => void;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lockedTasks, setLockedTasks] = useState<Record<string, { lockedBy: string; userName: string }>>({});
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    if (!token || !user) {
      if (socket) { socket.disconnect(); setSocket(null); }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // Board data events
    newSocket.on('task_created', ({ task, columnId }) => {
      useBoardStore.getState().syncTaskCreated(task, columnId);
    });
    newSocket.on('task_updated', ({ task }) => {
      useBoardStore.getState().syncTaskUpdated(task);
    });
    newSocket.on('task_moved', ({ taskId, newColumnId, newPosition, version }) => {
      useBoardStore.getState().syncTaskMoved(taskId, newColumnId, newPosition, version);
    });
    newSocket.on('task_deleted', ({ taskId }) => {
      useBoardStore.getState().syncTaskDeleted(taskId);
    });
    newSocket.on('column_created', ({ column }) => {
      useBoardStore.getState().syncColumnCreated(column);
    });
    newSocket.on('column_updated', ({ column }) => {
      useBoardStore.getState().syncColumnUpdated(column);
    });
    newSocket.on('column_moved', ({ columnId, newPosition }) => {
      useBoardStore.getState().syncColumnMoved(columnId, newPosition);
    });
    newSocket.on('column_deleted', ({ columnId }) => {
      useBoardStore.getState().syncColumnDeleted(columnId);
    });
    newSocket.on('board_meta_changed', ({ boardId, type, title }) => {
      if (type === 'renamed' && title) {
        useBoardStore.getState().syncBoardUpdated(boardId, title);
      } else if (type === 'deleted') {
        const activeBoard = useBoardStore.getState().activeBoard;
        useBoardStore.getState().syncBoardDeleted(boardId);
        addToast('info', 'This board has been deleted by the owner');
        if (activeBoard?.id === boardId) {
          window.location.hash = '#/';
        }
      }
    });

    // Collaboration events
    newSocket.on('member_added', ({ member }) => {
      useBoardStore.getState().syncMemberAdded(member);
      addToast('info', `${member.user.name} joined the board`);
    });
    newSocket.on('member_removed', ({ userId }) => {
      const activeBoard = useBoardStore.getState().activeBoard;
      const removedUser = activeBoard?.members.find(m => m.userId === userId);
      useBoardStore.getState().syncMemberRemoved(userId);
      if (removedUser && removedUser.userId !== user.id) {
        addToast('info', `${removedUser.user.name} left the board`);
      }
    });

    // Presence tracking
    newSocket.on('board_presence', ({ onlineUsers: users }: { onlineUsers: OnlineUser[] }) => {
      setOnlineUsers(users);
    });

    // Drag locking
    newSocket.on('task_locked', (data: TaskLock) => {
      setLockedTasks(prev => {
        const next = { ...prev };
        if (data.isLocked) {
          next[data.taskId] = { lockedBy: data.lockedBy, userName: data.userName };
        } else {
          delete next[data.taskId];
        }
        return next;
      });
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setOnlineUsers([]);
    });

    return () => { newSocket.disconnect(); };
  }, [token, user]);

  const emitDraggingState = useCallback((boardId: string, taskId: string, isDragging: boolean) => {
    if (socket?.connected) {
      socket.emit('task_dragging', { boardId, taskId, isDragging });
    }
  }, [socket]);

  const joinBoard = useCallback((boardId: string) => {
    if (socket?.connected) {
      socket.emit('join_board', boardId);
    }
  }, [socket]);

  const leaveBoard = useCallback((boardId: string) => {
    if (socket?.connected) {
      socket.emit('leave_board', boardId);
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{
      socket, lockedTasks, onlineUsers,
      toasts, dismissToast,
      emitDraggingState, joinBoard, leaveBoard,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
