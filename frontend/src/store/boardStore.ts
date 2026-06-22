import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: number;
  version: number;
  assignedTo: string | null;
  assignee?: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
}

export interface BoardMember {
  boardId: string;
  userId: string;
  role: string;
  user: User;
}

export interface Board {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  columns: Column[];
  members: BoardMember[];
}

interface BoardState {
  boards: Board[];
  activeBoard: Board | null;
  loading: boolean;
  error: string | null;
  conflictMessage: string | null;
  
  // Actions
  setConflictMessage: (msg: string | null) => void;
  fetchBoards: () => Promise<void>;
  fetchBoardDetails: (boardId: string) => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  
  // Columns
  createColumn: (boardId: string, title: string) => Promise<void>;
  moveColumnLocally: (columnId: string, newPosition: number) => void;
  moveColumnOnServer: (boardId: string, columnId: string, newPosition: number) => Promise<void>;
  deleteColumn: (boardId: string, columnId: string) => Promise<void>;
  
  // Tasks
  createTask: (boardId: string, columnId: string, title: string, description?: string) => Promise<void>;
  updateTaskDetails: (boardId: string, taskId: string, data: { title: string; description: string; assignedTo?: string | null }) => Promise<void>;
  deleteTask: (boardId: string, taskId: string) => Promise<void>;
  moveTaskLocally: (taskId: string, sourceColId: string, destColId: string, position: number) => void;
  moveTaskOnServer: (boardId: string, taskId: string, newColumnId: string, newPosition: number, currentVersion: number) => Promise<void>;
  
  // Real-time synchronization handlers
  syncTaskCreated: (task: Task, columnId: string) => void;
  syncTaskUpdated: (task: Task) => void;
  syncTaskMoved: (taskId: string, newColumnId: string, newPosition: number, version: number) => void;
  syncTaskDeleted: (taskId: string) => void;
  syncColumnCreated: (column: Column) => void;
  syncColumnMoved: (columnId: string, newPosition: number) => void;
  syncColumnDeleted: (columnId: string) => void;
  syncMemberAdded: (member: BoardMember) => void;
  syncMemberRemoved: (userId: string) => void;
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoard: null,
  loading: false,
  error: null,
  conflictMessage: null,

  setConflictMessage: (msg) => set({ conflictMessage: msg }),

  fetchBoards: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`${API_URL}/boards`, getHeaders());
      set({ boards: res.data.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch boards', loading: false });
    }
  },

  fetchBoardDetails: async (boardId) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`${API_URL}/boards/${boardId}`, getHeaders());
      set({ activeBoard: res.data.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch board details', loading: false });
    }
  },

  createBoard: async (title) => {
    try {
      const res = await axios.post(`${API_URL}/boards`, { title }, getHeaders());
      set((state) => ({ boards: [res.data.data, ...state.boards] }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create board' });
    }
  },

  createColumn: async (boardId, title) => {
    try {
      await axios.post(`${API_URL}/columns`, { boardId, title }, getHeaders());
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create column' });
    }
  },

  moveColumnLocally: (columnId, newPosition) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const updatedColumns = activeBoard.columns.map((col) =>
      col.id === columnId ? { ...col, position: newPosition } : col
    );
    updatedColumns.sort((a, b) => a.position - b.position);

    set({ activeBoard: { ...activeBoard, columns: updatedColumns } });
  },

  moveColumnOnServer: async (boardId, columnId, newPosition) => {
    try {
      await axios.put(`${API_URL}/columns/${columnId}/move`, { newPosition, boardId }, getHeaders());
    } catch (err: any) {
      // Re-fetch in case of failure to align client UI
      get().fetchBoardDetails(boardId);
    }
  },

  deleteColumn: async (boardId, columnId) => {
    try {
      await axios.delete(`${API_URL}/columns/${columnId}?boardId=${boardId}`, getHeaders());
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete column' });
    }
  },

  createTask: async (boardId, columnId, title, description = '') => {
    try {
      await axios.post(`${API_URL}/tasks`, { columnId, title, description, boardId }, getHeaders());
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create task' });
    }
  },

  updateTaskDetails: async (boardId, taskId, data) => {
    try {
      await axios.put(`${API_URL}/tasks/${taskId}`, { ...data, boardId }, getHeaders());
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update task' });
    }
  },

  deleteTask: async (boardId, taskId) => {
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}?boardId=${boardId}`, getHeaders());
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete task' });
    }
  },

  moveTaskLocally: (taskId, sourceColId, destColId, position) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    let targetTask: Task | null = null;
    
    // 1. Remove task from source column
    const updatedColumns = activeBoard.columns.map((col) => {
      if (col.id === sourceColId) {
        const found = col.tasks.find((t) => t.id === taskId);
        if (found) targetTask = found;
        return {
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        };
      }
      return col;
    });

    if (!targetTask) return;

    // 2. Insert task into destination column at its sorted spot
    const taskToInsert: Task = {
      ...(targetTask as Task),
      columnId: destColId,
      position,
    };

    const finalColumns = updatedColumns.map((col) => {
      if (col.id === destColId) {
        const newTasks = [...col.tasks, taskToInsert];
        newTasks.sort((a, b) => a.position - b.position);
        return {
          ...col,
          tasks: newTasks,
        };
      }
      return col;
    });

    set({ activeBoard: { ...activeBoard, columns: finalColumns } });
  },

  moveTaskOnServer: async (boardId, taskId, newColumnId, newPosition, currentVersion) => {
    try {
      await axios.put(
        `${API_URL}/tasks/${taskId}/move`,
        { newColumnId, newPosition, currentVersion, boardId },
        getHeaders()
      );
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Rollback triggers: pull fresh layout from DB & display warning
        set({ conflictMessage: 'Collision! This task was moved by someone else. Synchronizing board...' });
        get().fetchBoardDetails(boardId);
      } else {
        // General error fallback
        set({ error: err.response?.data?.message || 'Network error: Position update reverted.' });
        get().fetchBoardDetails(boardId);
      }
    }
  },

  // ----------------------------------------------------
  // SOCKET-DRIVEN REAL-TIME RECONCILIATION
  // ----------------------------------------------------

  syncTaskCreated: (task, columnId) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const columns = activeBoard.columns.map((col) => {
      if (col.id === columnId) {
        // Prevent duplicate append in case we created it locally
        if (col.tasks.some((t) => t.id === task.id)) return col;
        return {
          ...col,
          tasks: [...col.tasks, task].sort((a, b) => a.position - b.position),
        };
      }
      return col;
    });

    set({ activeBoard: { ...activeBoard, columns } });
  },

  syncTaskUpdated: (task) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const columns = activeBoard.columns.map((col) => {
      if (col.id === task.columnId) {
        return {
          ...col,
          tasks: col.tasks.map((t) => (t.id === task.id ? task : t)),
        };
      }
      return col;
    });

    set({ activeBoard: { ...activeBoard, columns } });
  },

  syncTaskMoved: (taskId, newColumnId, newPosition, version) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    let targetTask: Task | null = null;
    
    // Extract task from its current column
    const cleanedColumns = activeBoard.columns.map((col) => {
      const found = col.tasks.find((t) => t.id === taskId);
      if (found) {
        targetTask = { ...found, columnId: newColumnId, position: newPosition, version };
        return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
      }
      return col;
    });

    if (!targetTask) return;

    // Put task into new column in sorted order
    const reconciledColumns = cleanedColumns.map((col) => {
      if (col.id === newColumnId) {
        return {
          ...col,
          tasks: [...col.tasks, targetTask!].sort((a, b) => a.position - b.position),
        };
      }
      return col;
    });

    set({ activeBoard: { ...activeBoard, columns: reconciledColumns } });
  },

  syncTaskDeleted: (taskId) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const columns = activeBoard.columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.id !== taskId),
    }));

    set({ activeBoard: { ...activeBoard, columns } });
  },

  syncColumnCreated: (column) => {
    const { activeBoard } = get();
    if (!activeBoard) return;
    if (activeBoard.columns.some((c) => c.id === column.id)) return;

    const columns = [...activeBoard.columns, { ...column, tasks: [] }].sort(
      (a, b) => a.position - b.position
    );

    set({ activeBoard: { ...activeBoard, columns } });
  },

  syncColumnMoved: (columnId, newPosition) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const columns = activeBoard.columns
      .map((col) => (col.id === columnId ? { ...col, position: newPosition } : col))
      .sort((a, b) => a.position - b.position);

    set({ activeBoard: { ...activeBoard, columns } });
  },

  syncColumnDeleted: (columnId) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const columns = activeBoard.columns.filter((col) => col.id !== columnId);
    set({ activeBoard: { ...activeBoard, columns } });
  },

  syncMemberAdded: (member) => {
    const { activeBoard } = get();
    if (!activeBoard) return;
    if (activeBoard.members.some(m => m.userId === member.userId)) return;
    set({ activeBoard: { ...activeBoard, members: [...activeBoard.members, member] } });
  },

  syncMemberRemoved: (userId) => {
    const { activeBoard } = get();
    if (!activeBoard) return;
    set({ activeBoard: { ...activeBoard, members: activeBoard.members.filter(m => m.userId !== userId) } });
  },
}));
