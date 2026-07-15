import { create } from 'zustand';
import { apiClient } from '../hooks/useApiClient';

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
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  labels: string[];
  attachments: string[];
  assignedTo: string[];
  assignees?: User[];
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
  description: string | null;
  color: string | null;
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

  // Filter States
  filterText: string;
  filterPriority: string;
  filterAssignee: string;
  filterLabel: string;
  filterOverdue: boolean;
  
  // Actions
  setConflictMessage: (msg: string | null) => void;
  fetchBoards: () => Promise<void>;
  fetchBoardDetails: (boardId: string) => Promise<void>;
  createBoard: (title: string, description?: string, color?: string) => Promise<void>;
  updateBoard: (boardId: string, data: { title?: string; description?: string | null; color?: string }) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;

  // Filters Actions
  setFilterText: (text: string) => void;
  setFilterPriority: (priority: string) => void;
  setFilterAssignee: (assignee: string) => void;
  setFilterLabel: (label: string) => void;
  setFilterOverdue: (overdue: boolean) => void;
  resetFilters: () => void;
  
  // Columns
  createColumn: (boardId: string, title: string) => Promise<void>;
  renameColumn: (boardId: string, columnId: string, title: string) => Promise<void>;
  moveColumnLocally: (columnId: string, newPosition: number) => void;
  moveColumnOnServer: (boardId: string, columnId: string, newPosition: number) => Promise<void>;
  deleteColumn: (boardId: string, columnId: string) => Promise<void>;
  
  // Tasks
  createTask: (boardId: string, data: {
    columnId: string;
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    dueDate?: string | null;
    labels?: string[];
    attachments?: string[];
    assignedTo?: string[];
  }) => Promise<void>;
  updateTaskDetails: (boardId: string, taskId: string, data: {
    title: string;
    description: string | null;
    assignedTo?: string[];
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    dueDate?: string | null;
    labels?: string[];
    attachments?: string[];
  }) => Promise<void>;
  uploadAttachment: (boardId: string, taskId: string, file: File, name?: string) => Promise<{ path: string; name: string } | null>;
  deleteTask: (boardId: string, taskId: string) => Promise<void>;
  moveTaskLocally: (taskId: string, sourceColId: string, destColId: string, position: number) => void;
  moveTaskOnServer: (boardId: string, taskId: string, newColumnId: string, newPosition: number, currentVersion: number) => Promise<void>;
  
  // Real-time synchronization handlers
  syncTaskCreated: (task: Task, columnId: string) => void;
  syncTaskUpdated: (task: Task) => void;
  syncTaskMoved: (taskId: string, newColumnId: string, newPosition: number, version: number) => void;
  syncTaskDeleted: (taskId: string) => void;
  syncColumnCreated: (column: Column) => void;
  syncColumnUpdated: (column: Column) => void;
  syncColumnMoved: (columnId: string, newPosition: number) => void;
  syncColumnDeleted: (columnId: string) => void;
  syncMemberAdded: (member: BoardMember) => void;
  syncMemberRemoved: (userId: string) => void;
  syncBoardUpdated: (boardId: string, title: string) => void;
  syncBoardDeleted: (boardId: string) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoard: null,
  loading: false,
  error: null,
  conflictMessage: null,

  // Filters Default state
  filterText: '',
  filterPriority: '',
  filterAssignee: '',
  filterLabel: '',
  filterOverdue: false,

  setConflictMessage: (msg) => set({ conflictMessage: msg }),

  setFilterText: (text) => set({ filterText: text }),
  setFilterPriority: (priority) => set({ filterPriority: priority }),
  setFilterAssignee: (assignee) => set({ filterAssignee: assignee }),
  setFilterLabel: (label) => set({ filterLabel: label }),
  setFilterOverdue: (overdue) => set({ filterOverdue: overdue }),
  resetFilters: () => set({
    filterText: '',
    filterPriority: '',
    filterAssignee: '',
    filterLabel: '',
    filterOverdue: false,
  }),

  fetchBoards: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/boards');
      set({ boards: res.data.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch boards', loading: false });
    }
  },

  fetchBoardDetails: async (boardId) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get(`/boards/${boardId}`);
      set({ activeBoard: res.data.data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch board details', loading: false });
    }
  },

  createBoard: async (title, description = '', color = '#6366f1') => {
    try {
      const res = await apiClient.post('/boards', { title, description, color });
      set((state) => ({ boards: [res.data.data, ...state.boards] }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create board' });
    }
  },

  updateBoard: async (boardId, data) => {
    try {
      const res = await apiClient.patch(`/boards/${boardId}`, data);
      const updatedBoard = res.data.data;
      set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? { ...b, ...updatedBoard } : b)),
        activeBoard: state.activeBoard?.id === boardId ? { ...state.activeBoard, ...updatedBoard } : state.activeBoard,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update board' });
    }
  },

  deleteBoard: async (boardId) => {
    try {
      await apiClient.delete(`/boards/${boardId}`);
      set((state) => ({
        boards: state.boards.filter((b) => b.id !== boardId),
        activeBoard: state.activeBoard?.id === boardId ? null : state.activeBoard,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete board' });
    }
  },

  createColumn: async (boardId, title) => {
    try {
      await apiClient.post('/columns', { boardId, title });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create column' });
    }
  },

  renameColumn: async (boardId, columnId, title) => {
    try {
      await apiClient.patch(`/columns/${columnId}`, { title, boardId });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to rename column' });
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
    const snapshot = get().activeBoard;
    try {
      await apiClient.put(`/columns/${columnId}/move`, { newPosition, boardId });
    } catch (err: any) {
      if (snapshot) set({ activeBoard: snapshot, error: err.response?.data?.message || 'Reverted column move' });
      else get().fetchBoardDetails(boardId);
    }
  },

  deleteColumn: async (boardId, columnId) => {
    try {
      await apiClient.delete(`/columns/${columnId}?boardId=${boardId}`);
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete column' });
    }
  },

  createTask: async (boardId, data) => {
    try {
      await apiClient.post('/tasks', { ...data, boardId });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to create task' });
    }
  },

  updateTaskDetails: async (boardId, taskId, data) => {
    try {
      const res = await apiClient.put(`/tasks/${taskId}`, { ...data, boardId });
      // Optimistically update local state with returned task
      const updatedTask = res.data.data;
      const { activeBoard } = get();
      if (activeBoard) {
        const columns = activeBoard.columns.map(col => ({
          ...col,
          tasks: col.tasks.map(t => (t.id === taskId ? { ...t, ...updatedTask } : t)),
        }));
        set({ activeBoard: { ...activeBoard, columns } });
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update task' });
      throw err;
    }
  },

  uploadAttachment: async (boardId, taskId, file, name) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('boardId', boardId);
      if (name) formData.append('name', name);
      const res = await apiClient.post(`/tasks/${taskId}/upload?boardId=${boardId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { path: res.data.data.path, name: res.data.data.name };
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to upload file' });
      return null;
    }
  },

  deleteTask: async (boardId, taskId) => {
    try {
      await apiClient.delete(`/tasks/${taskId}?boardId=${boardId}`);
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
    const snapshot = get().activeBoard;
    try {
      await apiClient.put(
        `/tasks/${taskId}/move`,
        { newColumnId, newPosition, currentVersion, boardId }
      );
    } catch (err: any) {
      if (err.response?.status === 409) {
        set({ conflictMessage: 'Collision! This task was moved by someone else. Synchronizing board...' });
        get().fetchBoardDetails(boardId);
      } else {
        if (snapshot) set({ activeBoard: snapshot, error: err.response?.data?.message || 'Network error: Position update reverted.' });
        else get().fetchBoardDetails(boardId);
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
      // If task was moved to a different column, we handles in syncTaskMoved
      return col;
    });

    set({ activeBoard: { ...activeBoard, columns } });
  },

  syncTaskMoved: (taskId, newColumnId, newPosition, version) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    let targetTask: Task | null = null;
    
    const cleanedColumns = activeBoard.columns.map((col) => {
      const found = col.tasks.find((t) => t.id === taskId);
      if (found) {
        targetTask = { ...found, columnId: newColumnId, position: newPosition, version };
        return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
      }
      return col;
    });

    if (!targetTask) return;

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

  syncColumnUpdated: (column) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const columns = activeBoard.columns.map((col) =>
      col.id === column.id ? { ...col, ...column, tasks: col.tasks } : col
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
    if (activeBoard.members.some((m) => m.userId === member.userId)) return;
    set({ activeBoard: { ...activeBoard, members: [...activeBoard.members, member] } });
  },

  syncMemberRemoved: (userId) => {
    const { activeBoard } = get();
    if (!activeBoard) return;
    set({ activeBoard: { ...activeBoard, members: activeBoard.members.filter((m) => m.userId !== userId) } });
  },

  syncBoardUpdated: (boardId, title) => {
    const { activeBoard, boards } = get();
    const updatedBoards = boards.map((b) => (b.id === boardId ? { ...b, title } : b));
    const updatedActive = activeBoard?.id === boardId ? { ...activeBoard, title } : activeBoard;
    set({ boards: updatedBoards, activeBoard: updatedActive });
  },

  syncBoardDeleted: (boardId) => {
    const { activeBoard, boards } = get();
    const updatedBoards = boards.filter((b) => b.id !== boardId);
    const updatedActive = activeBoard?.id === boardId ? null : activeBoard;
    set({ boards: updatedBoards, activeBoard: updatedActive });
  },
}));
