import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useBoardStore } from '../store/boardStore';
import type { Column } from '../store/boardStore';
import { TaskCard } from './TaskCard';
import { Plus, Trash2, Check, X } from 'lucide-react';

const COLUMN_COLORS = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b',
  '#a855f7', '#ef4444', '#3b82f6', '#ec4899',
];

interface ColumnContainerProps {
  column: Column;
  boardId: string;
  index: number;
}

export const ColumnContainer: React.FC<ColumnContainerProps> = ({ column, boardId, index }) => {
  const { createTask, deleteColumn } = useBoardStore();
  const [isAdding, setIsAdding] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');

  const dotColor = COLUMN_COLORS[index % COLUMN_COLORS.length];

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createTask(boardId, column.id, taskTitle.trim(), taskDesc.trim());
    setTaskTitle('');
    setTaskDesc('');
    setIsAdding(false);
  };

  const handleDeleteColumn = async () => {
    if (confirm(`Delete column "${column.title}"? All tasks inside will be permanently deleted.`)) {
      await deleteColumn(boardId, column.id);
    }
  };

  return (
    <div
      className={`board-column glass-panel ${isOver ? 'drop-over' : ''}`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {/* Column header */}
      <div className="column-header">
        <div className="column-title">
          <div className="column-dot" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}55` }} />
          <span>{column.title}</span>
          <span className="column-badge">{column.tasks.length}</span>
        </div>
        <button className="btn-icon danger" onClick={handleDeleteColumn} title="Delete column">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Droppable task list */}
      <div ref={setNodeRef} className="task-list">
        <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task, taskIndex) => (
            <TaskCard key={task.id} task={task} boardId={boardId} taskIndex={taskIndex} />
          ))}
        </SortableContext>

        {/* Empty column drop hint */}
        {column.tasks.length === 0 && (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '1.25rem',
            textAlign: 'center',
            fontSize: '0.78rem',
            color: 'var(--text-dark)',
          }}>
            Drop tasks here
          </div>
        )}
      </div>

      {/* Add task */}
      <div style={{ marginTop: '0.75rem' }}>
        {isAdding ? (
          <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <input
              type="text"
              placeholder="Task title..."
              className="input-field"
              style={{ padding: '0.45rem 0.7rem', fontSize: '0.83rem' }}
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              required
              autoFocus
            />
            <input
              type="text"
              placeholder="Short description (optional)"
              className="input-field"
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem' }}
              value={taskDesc}
              onChange={e => setTaskDesc(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                <Check size={13} /> Add
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                onClick={() => { setTaskTitle(''); setTaskDesc(''); setIsAdding(false); }}
              >
                <X size={13} />
              </button>
            </div>
          </form>
        ) : (
          <button
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.45rem', fontSize: '0.8rem', borderStyle: 'dashed' }}
            onClick={() => setIsAdding(true)}
          >
            <Plus size={13} />
            <span>Add task</span>
          </button>
        )}
      </div>
    </div>
  );
};
