import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import type { Task } from '../store/boardStore';
import { X, Calendar, User, Tag, AlertCircle, Trash2 } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
  const { activeBoard, updateTaskDetails, deleteTask } = useBoardStore();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'MEDIUM');
  const [assignedTo, setAssignedTo] = useState<string[]>(task.assignedTo || []);
  
  // Format due date for date input (YYYY-MM-DD)
  const initialDueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
  const [dueDate, setDueDate] = useState(initialDueDate);

  const [labels, setLabels] = useState<string[]>(task.labels || []);
  const [newLabel, setNewLabel] = useState('');

  const [attachments, setAttachments] = useState<string[]>(task.attachments || []);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (type: 'bold' | 'italic' | 'link') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    if (type === 'bold') {
      replacement = `**${selectedText || 'bold text'}**`;
      cursorOffset = selectedText ? replacement.length : 2;
    } else if (type === 'italic') {
      replacement = `*${selectedText || 'italic text'}*`;
      cursorOffset = selectedText ? replacement.length : 1;
    } else if (type === 'link') {
      const url = prompt('Enter the link URL:', 'https://');
      if (url === null) return;
      replacement = `[${selectedText || 'link text'}](${url})`;
      cursorOffset = replacement.length;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setDescription(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  };

  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = newAttachmentUrl.trim();
    const cleanName = newAttachmentName.trim();
    if (!cleanUrl) return;

    let formattedUrl = cleanUrl;
    if (!/^https?:\/\//i.test(cleanUrl)) {
      formattedUrl = 'https://' + cleanUrl;
    }

    const nameToUse = cleanName || 'Link';
    const attachmentString = `${nameToUse}|${formattedUrl}`;

    if (attachments.includes(attachmentString)) {
      setNewAttachmentUrl('');
      setNewAttachmentName('');
      return;
    }

    setAttachments([...attachments, attachmentString]);
    setNewAttachmentUrl('');
    setNewAttachmentName('');
  };

  const handleRemoveAttachment = (attToRemove: string) => {
    setAttachments(attachments.filter((att) => att !== attToRemove));
  };

  const handleAddLabel = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = newLabel.trim().toLowerCase();
    if (!cleanLabel) return;
    if (labels.includes(cleanLabel)) {
      setNewLabel('');
      return;
    }
    if (labels.length >= 10) {
      setErrorMsg('Maximum 10 labels allowed');
      return;
    }
    setLabels([...labels, cleanLabel]);
    setNewLabel('');
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter((l) => l !== labelToRemove));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('Task title cannot be empty');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await updateTaskDetails(activeBoard!.id, task.id, {
        title,
        description: description.trim() || null,
        assignedTo,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labels,
        attachments,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(activeBoard!.id, task.id);
        onClose();
      } catch (err: any) {
        setErrorMsg('Failed to delete task');
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="task-detail-modal-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-area">
            <span className={`priority-indicator-bar ${priority.toLowerCase()}`} />
            <input
              type="text"
              className="modal-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task Title"
            />
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body Grid */}
        <div className="modal-body-grid">
          {/* Main Info */}
          <div className="modal-main-section">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label htmlFor="task-description" style={{ margin: 0 }}>Description</label>
                <div className="markdown-toolbar" style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => insertFormatting('bold')}
                    className="markdown-btn"
                    style={{ fontWeight: 'bold' }}
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('italic')}
                    className="markdown-btn"
                    style={{ fontStyle: 'italic' }}
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('link')}
                    className="markdown-btn"
                    title="Link"
                  >
                    🔗 Link
                  </button>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                id="task-description"
                className="input-field"
                placeholder="Add a more detailed description... (Use B / I / Link buttons above to format)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
              />
            </div>

            {/* Labels section */}
            <div className="form-group">
              <label>Labels</label>
              <div className="labels-manager">
                <div className="labels-list">
                  {labels.map((label) => (
                    <span key={label} className="label-tag">
                      {label}
                      <button type="button" className="remove-label-btn" onClick={() => handleRemoveLabel(label)}>
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <form onSubmit={handleAddLabel} className="add-label-form">
                  <Tag size={16} className="tag-input-icon" />
                  <input
                    type="text"
                    placeholder="Add label..."
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    maxLength={40}
                  />
                  <button type="submit" className="btn-add-label">
                    Add
                  </button>
                </form>
              </div>
            </div>

            {/* Attachments section */}
            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label>Attachments</label>
              <div className="attachments-manager" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.75rem' }}>
                {attachments.length > 0 && (
                  <div className="attachments-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {attachments.map((att) => {
                      const [name, url] = att.split('|');
                      return (
                        <div key={att} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-glass)', padding: '0.35rem 0.6rem', borderRadius: '6px' }}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}
                          >
                            {name}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <form onSubmit={handleAddAttachment} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Link Title (e.g. Design Mockup)"
                    value={newAttachmentName}
                    onChange={(e) => setNewAttachmentName(e.target.value)}
                    style={{ flex: 1, minWidth: '140px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="File or Page URL..."
                    value={newAttachmentUrl}
                    onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    style={{ flex: 1.5, minWidth: '180px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                    required
                  />
                  <button
                    type="submit"
                    style={{ background: 'var(--color-primary)', border: 'none', color: 'white', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Attach
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar controls */}
          <div className="modal-sidebar-section">
            {/* Priority */}
            <div className="sidebar-group">
              <label><AlertCircle size={16} /> Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className={`priority-select ${priority.toLowerCase()}`}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignees */}
            <div className="sidebar-group">
              <label><User size={16} /> Assignees</label>
              <div
                style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  background: 'rgba(0, 0, 0, 0.15)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '6px',
                  padding: '0.4rem 0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                {activeBoard?.members.map((member) => {
                  const isChecked = assignedTo.includes(member.user.id);
                  return (
                    <label
                      key={member.user.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem',
                        color: isChecked ? 'var(--text-main)' : 'var(--text-main)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        margin: 0,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setAssignedTo(assignedTo.filter((id) => id !== member.user.id));
                          } else {
                            setAssignedTo([...assignedTo, member.user.id]);
                          }
                        }}
                        style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                      />
                      <span>{member.user.name}</span>
                    </label>
                  );
                })}
                {(!activeBoard?.members || activeBoard.members.length === 0) && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>No board members</span>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div className="sidebar-group">
              <label><Calendar size={16} /> Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="date-input"
              />
            </div>

            {errorMsg && <div className="sidebar-error-msg">{errorMsg}</div>}

            <div className="sidebar-actions">
              <button
                type="button"
                className="btn-save-task"
                disabled={loading}
                onClick={handleSave}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              
              <button
                type="button"
                className="btn-delete-task"
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                <span>Delete Task</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
