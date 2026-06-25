import React, { useEffect, useRef } from 'react';
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
import Sidebar from './Sidebar';
import {
  AlertCircle, X, CheckCircle, Info, FolderKanban,
  Search, Filter, Calendar, AlertTriangle
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
              className="toast-close-btn"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

interface BoardPageProps {
  boardId: string;
}

export const BoardPage: React.FC<BoardPageProps> = ({ boardId }) => {
  const {
    activeBoard,
    loading,
    fetchBoards,
    fetchBoardDetails,
    moveTaskLocally,
    moveTaskOnServer,
    conflictMessage,
    setConflictMessage,
    // Filters state
    filterText,
    filterPriority,
    filterAssignee,
    filterLabel,
    filterOverdue,
    // Filters actions
    setFilterText,
    setFilterPriority,
    setFilterAssignee,
    setFilterLabel,
    setFilterOverdue,
    resetFilters,
  } = useBoardStore();

  const { joinBoard, leaveBoard } = useSocket();
  const prevBoardId = useRef<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (!boardId) return;

    // Leave previous room if any
    if (prevBoardId.current && prevBoardId.current !== boardId) {
      leaveBoard(prevBoardId.current);
    }

    // Fetch and join new room
    fetchBoardDetails(boardId).then(() => {
      joinBoard(boardId);
    });

    prevBoardId.current = boardId;

    return () => {
      if (boardId) leaveBoard(boardId);
    };
  }, [boardId, fetchBoardDetails, joinBoard, leaveBoard]);

  useEffect(() => {
    if (conflictMessage) {
      const t = setTimeout(() => setConflictMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [conflictMessage, setConflictMessage]);

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

  // Compute all unique labels on this board for filters
  const uniqueLabels = activeBoard
    ? Array.from(
        new Set(
          activeBoard.columns.flatMap(col =>
            col.tasks.flatMap(t => t.labels || [])
          )
        )
      )
    : [];

  const hasActiveFilters =
    filterText || filterPriority || filterAssignee || filterLabel || filterOverdue;

  return (
    <div className="board-page-layout">
      {/* Sidebar Panel */}
      <Sidebar activeBoardId={boardId} />

      {/* Main Board Content */}
      <div className="board-main-content">
        <ParticleBackground />

        {loading && !activeBoard ? (
          <div className="board-container">
            <SkeletonLoader />
          </div>
        ) : activeBoard ? (
          <div className="board-container">
            <BoardHeader boardId={activeBoard.id} />

            {/* Filter Bar */}
            <div className="filter-bar glass-panel animate-fade-in">
              <div className="filter-group-left">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                  />
                  {filterText && (
                    <button className="clear-search-btn" onClick={() => setFilterText('')}>
                      &times;
                    </button>
                  )}
                </div>

                <div className="filter-dropdown-wrapper">
                  <Filter size={14} className="filter-icon" />
                  
                  {/* Priority Filter */}
                  <select
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>

                  {/* Assignee Filter */}
                  <select
                    value={filterAssignee}
                    onChange={e => setFilterAssignee(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Members</option>
                    {activeBoard.members.map(m => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>

                  {/* Label Filter */}
                  <select
                    value={filterLabel}
                    onChange={e => setFilterLabel(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Labels</option>
                    {uniqueLabels.map(l => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="checkbox-filter-label">
                  <input
                    type="checkbox"
                    checked={filterOverdue}
                    onChange={e => setFilterOverdue(e.target.checked)}
                  />
                  <Calendar size={14} />
                  <span>Overdue Only</span>
                </label>
              </div>

              {hasActiveFilters && (
                <button className="btn-clear-filters" onClick={resetFilters}>
                  Clear Filters
                </button>
              )}
            </div>

            {/* Dnd Canvas */}
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
              Board not found or you are not a member.
            </p>
            <a href="#/" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Go to Dashboard
            </a>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <ToastDisplay />

      {/* Conflict overlay */}
      {conflictMessage && (
        <div className="toast-container">
          <div className="toast error">
            <AlertTriangle size={16} />
            <span style={{ flex: 1 }}>{conflictMessage}</span>
            <button
              onClick={() => setConflictMessage(null)}
              className="toast-close-btn"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardPage;
