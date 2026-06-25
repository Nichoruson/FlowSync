import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '../store/boardStore';
import type { Task } from '../store/boardStore';
import { useSocket } from '../context/SocketContext';
import { Edit2, Trash2, Check, X, ShieldAlert, FileText, Calendar, AlertCircle, Paperclip } from 'lucide-react';
import TaskDetailModal from './TaskDetailModal';

const renderMarkdown = (text: string | null): React.ReactNode => {
  if (!text) {
    return <span style={{ fontStyle: 'italic', color: 'var(--text-dark)' }}>No description provided.</span>;
  }

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    let html = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: underline;" onclick="event.stopPropagation()">$1</a>'
    );

    return (
      <div
        key={lineIdx}
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ minHeight: lineIdx > 0 && line === '' ? '0.75rem' : 'auto' }}
      />
    );
  });
};

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
  const [showDetailModal, setShowDetailModal] = useState(false);

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
      description: editDesc.trim() || null,
    });
    setIsEditing(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this task?')) await deleteTask(boardId, task.id);
  };



  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;
  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

  return (
    <>
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
            {/* Labels chips */}
            {task.labels && task.labels.length > 0 && (
              <div className="task-labels-container">
                {task.labels.map((label) => (
                  <span key={label} className="task-label-badge">
                    {label}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
              <h4 className="task-title" style={{ flex: 1 }}>{task.title}</h4>
              <div className="task-actions-btn-group">
                <button
                  className="btn-icon"
                  onClick={e => { e.stopPropagation(); setIsEditing(true); }}
                  title="Edit title/desc inline"
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
                <button
                  className="btn-details"
                  onClick={(e) => { e.stopPropagation(); setShowDetailModal(true); }}
                  title="View Details"
                >
                  Details
                </button>
              </div>
            </div>

            {/* Details section */}
            <div className="task-details-preview" style={{ marginTop: '0.5rem', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dark)', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Details</span>
              <div className="task-desc" style={{ margin: 0 }}>
                {renderMarkdown(task.description)}
              </div>
            </div>

            {/* Middle Section: Priority, Due Date & Attachments */}
            <div className="task-card-meta-row">
              {task.priority && (
                <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                  <AlertCircle size={10} />
                  {task.priority}
                </span>
              )}

              {task.dueDate && (
                <span className={`due-date-badge ${isOverdue ? 'overdue' : ''}`}>
                  <Calendar size={10} />
                  {formattedDueDate}
                </span>
              )}

              {task.attachments && task.attachments.length > 0 && (
                <span className="due-date-badge" title={`${task.attachments.length} attachment(s)`} style={{ gap: '0.2rem' }}>
                  <Paperclip size={10} />
                  <span>{task.attachments.length}</span>
                </span>
              )}
            </div>

            <div className="task-footer">
              <span className="version-badge">
                <FileText size={9} />
                v{task.version}
              </span>

              {task.assignees && task.assignees.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }} title={`Assigned to: ${task.assignees.map(u => u.name).join(', ')}`}>
                  <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
                    {task.assignees.map((assigneeUser, idx) => {
                      const userAvatarColor = AVATAR_COLORS[assigneeUser.name.charCodeAt(0) % AVATAR_COLORS.length];
                      return (
                        <div
                          key={assigneeUser.id}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: userAvatarColor,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            border: '1.5px solid var(--bg-surface)',
                            marginLeft: idx > 0 ? '-6px' : '0',
                            zIndex: idx,
                            position: 'relative',
                          }}
                        >
                          {assigneeUser.name.charAt(0).toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>Unassigned</span>
              )}
            </div>
          </>
        )}
      </div>

      {showDetailModal && (
        <TaskDetailModal
          task={task}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </>
  );
};
