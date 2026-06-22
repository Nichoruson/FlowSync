import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '../store/boardStore';
import type { Task } from '../store/boardStore';
import { useSocket } from '../context/SocketContext';
import { Edit2, Trash2, Check, X, ShieldAlert, FileText } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  boardId: string;
  taskIndex?: number;
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #06b6d4, #0ea5e9)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
];

export const TaskCard: React.FC<TaskCardProps> = ({ task, boardId, taskIndex = 0 }) => {
  const { lockedTasks, emitDraggingState } = useSocket();
  const { deleteTask, updateTaskDetails } = useBoardStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description || '');

  const lockInfo = lockedTasks[task.id];
  const isLocked = !!lockInfo;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isLocked || isEditing,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 0.2s ease',
    touchAction: 'none',
    animationDelay: `${taskIndex * 0.04}s`,
  };

  React.useEffect(() => {
    emitDraggingState(boardId, task.id, isDragging);
  }, [isDragging, boardId, task.id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    await updateTaskDetails(boardId, task.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
    });
    setIsEditing(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this task?')) await deleteTask(boardId, task.id);
  };

  const avatarColor = task.assignee
    ? AVATAR_COLORS[task.assignee.name.charCodeAt(0) % AVATAR_COLORS.length]
    : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'is-dragging' : ''} ${isLocked ? 'locked' : ''}`}
      {...attributes}
      {...listeners}
    >
      {/* Collaboration lock overlay */}
      {isLocked && (
        <div className="task-lock-overlay">
          <ShieldAlert size={14} />
          <span>{lockInfo.userName} is moving this</span>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
          <input
            type="text"
            className="input-field"
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            required
            autoFocus
          />
          <textarea
            className="input-field"
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', minHeight: '56px', resize: 'vertical' }}
            placeholder="Description..."
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
            <button type="submit" className="btn-primary" style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}>
              <Check size={12} /> Save
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              onClick={() => { setEditTitle(task.title); setEditDesc(task.description || ''); setIsEditing(false); }}
            >
              <X size={12} />
            </button>
          </div>
        </form>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
            <h4 className="task-title" style={{ flex: 1 }}>{task.title}</h4>
            <div style={{ display: 'flex', gap: '0.1rem', opacity: 0, transition: 'opacity 0.15s ease' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <button
                className="btn-icon"
                onClick={e => { e.stopPropagation(); setIsEditing(true); }}
                title="Edit"
              >
                <Edit2 size={12} />
              </button>
              <button
                className="btn-icon danger"
                onClick={handleDelete}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="task-desc">{task.description}</p>
          )}

          <div className="task-footer">
            <span className="version-badge">
              <FileText size={9} />
              v{task.version}
            </span>

            {task.assignee && (
              <div
                title={`Assigned: ${task.assignee.name}`}
                style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: avatarColor, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 700,
                  border: '1.5px solid var(--bg-surface)',
                }}
              >
                {task.assignee.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
