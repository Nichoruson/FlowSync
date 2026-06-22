import React, { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { useBoardStore } from '../store/boardStore';
import type { Task } from '../store/boardStore';
import { useSocket } from '../context/SocketContext';
import { BoardHeader } from './BoardHeader';
import { ColumnContainer } from './ColumnContainer';
import { ParticleBackground } from './ParticleBackground';
import { SkeletonLoader } from './SkeletonLoader';
import {
  AlertCircle, Plus, LayoutGrid, X, CheckCircle, Info,
  FolderKanban, Zap
} from 'lucide-react';

// Toast Notification Component
const ToastDisplay: React.FC = () => {
  const { toasts, dismissToast } = useSocket();
  if (toasts.length === 0) return null;

  const iconMap = { error: AlertCircle, success: CheckCircle, info: Info };

  return (
    <div className="toast-container">
      {toasts.map(t => {
        const Icon = iconMap[t.type];
        return (
          <div key={t.id} className={`toast ${t.type}`}>
            <Icon size={16} />
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7, padding: '0.1rem' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const BoardPage: React.FC = () => {
  const {
    activeBoard, boards, loading,
    fetchBoards, fetchBoardDetails, createBoard,
    moveTaskLocally, moveTaskOnServer,
    conflictMessage, setConflictMessage,
  } = useBoardStore();
  const { joinBoard, leaveBoard } = useSocket();

  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const prevBoardId = useRef<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => { fetchBoards(); }, []);

  useEffect(() => {
    if (boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards]);

  useEffect(() => {
    if (!selectedBoardId) return;
    if (prevBoardId.current && prevBoardId.current !== selectedBoardId) {
      leaveBoard(prevBoardId.current);
    }
    fetchBoardDetails(selectedBoardId).then(() => {
      joinBoard(selectedBoardId);
    });
    prevBoardId.current = selectedBoardId;

    return () => {
      if (selectedBoardId) leaveBoard(selectedBoardId);
    };
  }, [selectedBoardId]);

  useEffect(() => {
    if (conflictMessage) {
      const t = setTimeout(() => setConflictMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [conflictMessage]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !activeBoard) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    let targetTask: Task | null = null;
    let sourceColId = '';

    activeBoard.columns.forEach(col => {
      const found = col.tasks.find(t => t.id === taskId);
      if (found) { targetTask = found; sourceColId = col.id; }
    });

    if (!targetTask) return;

    let destColId = '';
    let newPosition = 1000;
    const isOverColumn = activeBoard.columns.some(col => col.id === overId);

    if (isOverColumn) {
      destColId = overId;
      const destCol = activeBoard.columns.find(col => col.id === destColId)!;
      newPosition = destCol.tasks.length > 0
        ? destCol.tasks[destCol.tasks.length - 1].position + 1000.0
        : 1000.0;
    } else {
      let overTask: Task | null = null;
      activeBoard.columns.forEach(col => {
        const found = col.tasks.find(t => t.id === overId);
        if (found) { overTask = found; destColId = col.id; }
      });

      if (!overTask || !destColId) return;
      const destCol = activeBoard.columns.find(col => col.id === destColId)!;
      const overIndex = destCol.tasks.findIndex(t => t.id === overId);

      if (sourceColId === destColId) {
        const sourceIndex = destCol.tasks.findIndex(t => t.id === taskId);
        if (sourceIndex === overIndex) return;

        if (overIndex === 0) {
          newPosition = destCol.tasks[0].position / 2.0;
        } else if (overIndex === destCol.tasks.length - 1) {
          newPosition = destCol.tasks[destCol.tasks.length - 1].position + 1000.0;
        } else {
          const idx1 = sourceIndex < overIndex ? overIndex : overIndex - 1;
          const idx2 = sourceIndex < overIndex ? overIndex + 1 : overIndex;
          newPosition = ((destCol.tasks[idx1]?.position ?? 0) + (destCol.tasks[idx2]?.position ?? 2000)) / 2.0;
        }
      } else {
        if (overIndex === 0) {
          newPosition = destCol.tasks[0].position / 2.0;
        } else {
          const posBefore = destCol.tasks[overIndex - 1]?.position ?? 0;
          const posAfter = destCol.tasks[overIndex]?.position ?? posBefore + 1000;
          newPosition = (posBefore + posAfter) / 2.0;
        }
      }
    }

    const currentVersion = (targetTask as Task).version;
    moveTaskLocally(taskId, sourceColId, destColId, newPosition);
    await moveTaskOnServer(activeBoard.id, taskId, destColId, newPosition, currentVersion);
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;
    await createBoard(newBoardTitle.trim());
    setNewBoardTitle('');
    setShowCreateModal(false);
    await fetchBoards();
  };

  return (
    <div className="app-root">
      <ParticleBackground />

      <div className="app-container">
        {/* Workspace top bar */}
        <div className="workspace-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '7px',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Zap size={16} color="white" />
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>
                FlowSync
              </span>
            </div>

            <div className="divider" />

            {/* Board selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LayoutGrid size={14} color="var(--text-dark)" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dark)' }}>Board:</span>
              <select
                className="input-field workspace-select"
                value={selectedBoardId}
                onChange={e => setSelectedBoardId(e.target.value)}
                style={{ width: 'auto', minWidth: '150px' }}
              >
                {boards.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>

            <button
              className="btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={13} />
              <span>New Board</span>
            </button>
          </div>

          {activeBoard && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dark)', fontFamily: 'monospace' }}>
              {activeBoard.id}
            </span>
          )}
        </div>

        {/* Main board area */}
        {loading && !activeBoard ? (
          <div className="board-container">
            <SkeletonLoader />
          </div>
        ) : activeBoard ? (
          <div className="board-container">
            <BoardHeader boardId={activeBoard.id} />

            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <div className="board-canvas">
                {activeBoard.columns.map((column, i) => (
                  <ColumnContainer
                    key={column.id}
                    column={column}
                    boardId={activeBoard.id}
                    index={i}
                  />
                ))}

                {/* Add column inline hint */}
                {activeBoard.columns.length === 0 && (
                  <div className="empty-state" style={{ minWidth: '240px' }}>
                    <div className="empty-state-icon">
                      <FolderKanban size={28} color="var(--color-primary)" />
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                      No columns yet. Click <strong>+ Column</strong> to add your first one.
                    </p>
                  </div>
                )}
              </div>
            </DndContext>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FolderKanban size={28} color="var(--color-primary)" />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No boards found. Create one to get started.
            </p>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
              <span>Create Board</span>
            </button>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <ToastDisplay />

      {/* Conflict overlay */}
      {conflictMessage && (
        <div className="toast-container">
          <div className="toast error">
            <AlertCircle size={16} />
            <span style={{ flex: 1 }}>{conflictMessage}</span>
            <button
              onClick={() => setConflictMessage(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Create board modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <form onSubmit={handleCreateBoard} className="modal-panel glass-panel" style={{ gap: '1rem', maxWidth: '380px' }}>
            <div className="modal-title">
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FolderKanban size={17} color="var(--color-primary)" />
              </div>
              Create New Board
            </div>
            <input
              type="text"
              placeholder="e.g. Marketing Q3 Sprint"
              className="input-field"
              value={newBoardTitle}
              onChange={e => setNewBoardTitle(e.target.value)}
              required
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.1rem' }}>
                <Plus size={15} />
                Create Board
              </button>
              <button type="button" className="btn-secondary" style={{ padding: '0.6rem 1rem' }} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
