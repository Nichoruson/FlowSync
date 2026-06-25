import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useBoardStore } from '../store/boardStore';
import type { Column } from '../store/boardStore';
import { TaskCard } from './TaskCard';
import { Plus, Trash2, Check, X, Edit2 } from 'lucide-react';

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
  const {
    createTask,
    deleteColumn,
    renameColumn,
    filterText,
    filterPriority,
    filterAssignee,
    filterLabel,
    filterOverdue,
  } = useBoardStore();

  const [isAdding, setIsAdding] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');

  // Column renaming state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);

  const dotColor = COLUMN_COLORS[index % COLUMN_COLORS.length];
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  // Apply filters to tasks
  const filteredTasks = column.tasks.filter((t) => {
    if (filterText) {
      const matchTitle = t.title.toLowerCase().includes(filterText.toLowerCase());
      const matchDesc = (t.description || '').toLowerCase().includes(filterText.toLowerCase());
      if (!matchTitle && !matchDesc) return false;
    }
    if (filterPriority && t.priority !== filterPriority) {
      return false;
    }
    if (filterAssignee && t.assignedTo !== filterAssignee) {
      return false;
    }
    if (filterLabel && !t.labels.includes(filterLabel.toLowerCase())) {
      return false;
    }
    if (filterOverdue) {
      if (!t.dueDate) return false;
      const isOverdue = new Date(t.dueDate) < new Date();
      if (!isOverdue) return false;
    }
    return true;
  });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createTask(boardId, {
      columnId: column.id,
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
    });
    setTaskTitle('');
    setTaskDesc('');
    setIsAdding(false);
  };

  const handleRenameSubmit = async () => {
    if (!editTitle.trim() || editTitle.trim() === column.title) {
      setIsEditingTitle(false);
      setEditTitle(column.title);
      return;
    }
    await renameColumn(boardId, column.id, editTitle.trim());
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditTitle(column.title);
    }
  };

  const handleDeleteColumn = async () => {
    if (window.confirm(`Delete column "${column.title}"? All tasks inside will be permanently deleted.`)) {
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
          
          {isEditingTitle ? (
            <input
              type="text"
              className="column-title-edit-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <span
              className="column-title-text"
              onDoubleClick={() => setIsEditingTitle(true)}
              title="Double click to rename"
            >
              {column.title}
            </span>
          )}

          <span className="column-badge">{filteredTasks.length}</span>
        </div>
        
        <div className="column-header-actions">
          <button className="btn-icon" onClick={() => setIsEditingTitle(true)} title="Rename column">
            <Edit2 size={12} />
          </button>
          <button className="btn-icon danger" onClick={handleDeleteColumn} title="Delete column">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Droppable task list */}
      <div ref={setNodeRef} className="task-list">
        <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {filteredTasks.map((task, taskIndex) => (
            <TaskCard key={task.id} task={task} boardId={boardId} taskIndex={taskIndex} />
          ))}
        </SortableContext>

        {/* Empty column drop hint */}
        {filteredTasks.length === 0 && (
          <div style={{
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '1.25rem',
            textAlign: 'center',
            fontSize: '0.78rem',
            color: 'var(--text-dark)',
          }}>
            {column.tasks.length > 0 ? 'No matching tasks' : 'Drop tasks here'}
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
