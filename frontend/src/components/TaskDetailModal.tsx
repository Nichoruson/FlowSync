import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useBoardStore } from '../store/boardStore';
import type { Task } from '../store/boardStore';
import {
  X, Calendar, User, Tag, AlertCircle, Trash2, Paperclip,
  Edit3, Save, Bold, Italic, Link2, Upload, FileText,
  Image, ExternalLink, Plus,
} from 'lucide-react';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

const PRIORITY_META = {
  LOW:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  label: 'Low' },
  MEDIUM: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   label: 'Medium' },
  HIGH:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   label: 'High' },
  URGENT: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    label: 'Urgent' },
};

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return <Image size={13} />;
  if (['pdf','doc','docx','xls','xlsx','ppt','pptx'].includes(ext)) return <FileText size={13} />;
  return <Paperclip size={13} />;
};

const isFilePath = (url: string) => url.startsWith('/uploads/');
const resolveUrl = (url: string) => {
  if (isFilePath(url)) {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    return API.replace('/api/v1', '') + url;
  }
  return url;
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
  const { activeBoard, updateTaskDetails, deleteTask, uploadAttachment } = useBoardStore();

  // ── Edit mode toggle ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);

  // ── Editable fields ───────────────────────────────────────────────────────
  const [title, setTitle]       = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<typeof PRIORITIES[number]>(task.priority || 'MEDIUM');
  const [assignedTo, setAssignedTo] = useState<string[]>(task.assignedTo || []);

  // Fix: parse dueDate as local date to avoid UTC off-by-one
  const toLocalDate = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const [dueDate, setDueDate] = useState(toLocalDate(task.dueDate));
  const [labels, setLabels]   = useState<string[]>(task.labels || []);
  const [newLabel, setNewLabel] = useState('');
  const [attachments, setAttachments] = useState<string[]>(task.attachments || []);

  // ── URL attachment form ────────────────────────────────────────────────────
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl]   = useState('');

  // ── File upload ────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // ── Status ─────────────────────────────────────────────────────────────────
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Textarea ref for markdown toolbar ─────────────────────────────────────
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────────

  const insertFormatting = (type: 'bold' | 'italic' | 'link') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.substring(s, e);
    let rep = '';
    if (type === 'bold')   rep = `**${sel || 'bold text'}**`;
    if (type === 'italic') rep = `*${sel || 'italic text'}*`;
    if (type === 'link')   {
      const url = prompt('Enter URL:', 'https://');
      if (!url) return;
      rep = `[${sel || 'link text'}](${url})`;
    }
    const next = value.substring(0, s) + rep + value.substring(e);
    setDescription(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(s + rep.length, s + rep.length);
    }, 0);
  };

  const handleAddUrlAttachment = (ev: React.FormEvent) => {
    ev.preventDefault();
    const rawUrl  = newAttachmentUrl.trim();
    const rawName = newAttachmentName.trim();
    if (!rawUrl) return;
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const attStr = `${rawName || 'Link'}|${url}`;
    if (!attachments.includes(attStr)) setAttachments(prev => [...prev, attStr]);
    setNewAttachmentUrl('');
    setNewAttachmentName('');
    setShowUrlForm(false);
  };

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeBoard) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const result = await uploadAttachment(activeBoard.id, task.id, file, file.name);
      if (result) {
        const attStr = `${result.name}|${result.path}`;
        setAttachments(prev => [...prev, attStr]);
      }
    }
    setUploading(false);
  }, [activeBoard, task.id, uploadAttachment]);

  const handleDrop = useCallback((ev: React.DragEvent) => {
    ev.preventDefault();
    setDragOver(false);
    handleFileUpload(ev.dataTransfer.files);
  }, [handleFileUpload]);

  const handleRemoveAttachment = (att: string) =>
    setAttachments(prev => prev.filter(a => a !== att));

  const handleAddLabel = (ev: React.FormEvent) => {
    ev.preventDefault();
    const clean = newLabel.trim().toLowerCase();
    if (!clean) return;
    if (labels.includes(clean)) { setNewLabel(''); return; }
    if (labels.length >= 10) { setErrorMsg('Maximum 10 labels'); return; }
    setLabels(prev => [...prev, clean]);
    setNewLabel('');
  };

  const handleSave = async () => {
    if (!title.trim()) { setErrorMsg('Title cannot be empty'); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      await updateTaskDetails(activeBoard!.id, task.id, {
        title:       title.trim(),
        description: description.trim() || null,
        assignedTo,
        priority,
        dueDate: dueDate ? new Date(dueDate + 'T00:00:00').toISOString() : null,
        labels,
        attachments,
      });
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task permanently?')) return;
    try {
      await deleteTask(activeBoard!.id, task.id);
      onClose();
    } catch {
      setErrorMsg('Failed to delete task');
    }
  };

  const cancelEdit = () => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'MEDIUM');
    setAssignedTo(task.assignedTo || []);
    setDueDate(toLocalDate(task.dueDate));
    setLabels(task.labels || []);
    setAttachments(task.attachments || []);
    setErrorMsg('');
    setIsEditing(false);
  };

  const pMeta = PRIORITY_META[priority];

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="tdm-card" onClick={e => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="tdm-header">
          <span
            className="tdm-priority-bar"
            style={{ background: pMeta.color }}
          />

          {isEditing ? (
            <input
              className="tdm-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title…"
              autoFocus
            />
          ) : (
            <h2 className="tdm-title-view">{title}</h2>
          )}

          <div className="tdm-header-actions">
            {isEditing ? (
              <>
                <button className="tdm-btn-save" onClick={handleSave} disabled={loading}>
                  <Save size={14} />
                  <span>{loading ? 'Saving…' : 'Save'}</span>
                </button>
                <button className="tdm-btn-cancel" onClick={cancelEdit}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="tdm-btn-edit" onClick={() => setIsEditing(true)}>
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            )}
            <button className="close-btn" onClick={onClose}>
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Body Grid ──────────────────────────────────────────────────── */}
        <div className="tdm-body">

          {/* Main column */}
          <div className="tdm-main">

            {/* ── Description ───────────────────────────────────────── */}
            <section className="tdm-section">
              <div className="tdm-section-header">
                <span className="tdm-section-label">Description</span>
                {isEditing && (
                  <div className="tdm-md-toolbar">
                    <button type="button" className="markdown-btn" title="Bold"   onClick={() => insertFormatting('bold')}><Bold size={11}/></button>
                    <button type="button" className="markdown-btn" title="Italic" onClick={() => insertFormatting('italic')}><Italic size={11}/></button>
                    <button type="button" className="markdown-btn" title="Link"   onClick={() => insertFormatting('link')}><Link2 size={11}/></button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  className="tdm-description-input"
                  placeholder="Add a detailed description…&#10;&#10;Supports multiple lines. Use the toolbar above for Bold, Italic, and Links."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={10}
                />
              ) : (
                <div className="tdm-description-view">
                  {description ? (
                    description.split('\n').map((line, i) => (
                      <p key={i} style={{ margin: line === '' ? '0.4rem 0' : '0', minHeight: line === '' ? '0.4rem' : undefined }}>
                        {line}
                      </p>
                    ))
                  ) : (
                    <span className="tdm-empty-hint">No description yet. Click Edit to add one.</span>
                  )}
                </div>
              )}
            </section>

            {/* ── Labels ────────────────────────────────────────────── */}
            <section className="tdm-section">
              <div className="tdm-section-header">
                <span className="tdm-section-label"><Tag size={13}/> Labels</span>
              </div>
              <div className="tdm-labels-area">
                {labels.map(lbl => (
                  <span key={lbl} className="tdm-label-chip">
                    {lbl}
                    {isEditing && (
                      <button
                        type="button"
                        className="tdm-chip-remove"
                        onClick={() => setLabels(prev => prev.filter(l => l !== lbl))}
                      >×</button>
                    )}
                  </span>
                ))}
                {isEditing && (
                  <form onSubmit={handleAddLabel} className="tdm-label-form">
                    <input
                      type="text"
                      className="tdm-label-input"
                      placeholder="Add label…"
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      maxLength={40}
                    />
                    <button type="submit" className="tdm-chip-add-btn">
                      <Plus size={12}/>
                    </button>
                  </form>
                )}
                {labels.length === 0 && !isEditing && (
                  <span className="tdm-empty-hint">No labels.</span>
                )}
              </div>
            </section>

            {/* ── Attachments ───────────────────────────────────────── */}
            <section className="tdm-section">
              <div className="tdm-section-header">
                <span className="tdm-section-label"><Paperclip size={13}/> Attachments</span>
                {isEditing && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="tdm-att-action-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      title="Upload file"
                    >
                      <Upload size={12}/> <span>{uploading ? 'Uploading…' : 'Upload File'}</span>
                    </button>
                    <button
                      type="button"
                      className="tdm-att-action-btn"
                      onClick={() => setShowUrlForm(v => !v)}
                      title="Add URL link"
                    >
                      <Link2 size={12}/> <span>Add URL</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              {isEditing && (
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => handleFileUpload(e.target.files)}
                />
              )}

              {/* Drop zone */}
              {isEditing && (
                <div
                  className={`tdm-dropzone ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} style={{ color: 'var(--text-dark)' }}/>
                  <span>{uploading ? 'Uploading…' : 'Drop files here or click to browse'}</span>
                </div>
              )}

              {/* URL form */}
              {isEditing && showUrlForm && (
                <form onSubmit={handleAddUrlAttachment} className="tdm-url-form">
                  <input
                    type="text"
                    className="tdm-url-input"
                    placeholder="Link title (optional)"
                    value={newAttachmentName}
                    onChange={e => setNewAttachmentName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="tdm-url-input"
                    placeholder="https://…"
                    value={newAttachmentUrl}
                    onChange={e => setNewAttachmentUrl(e.target.value)}
                    required
                  />
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button type="submit" className="tdm-btn-save" style={{ flex: 1 }}>Attach</button>
                    <button type="button" className="tdm-btn-cancel" onClick={() => setShowUrlForm(false)}>Cancel</button>
                  </div>
                </form>
              )}

              {/* Attachments list */}
              <div className="tdm-att-list">
                {attachments.map(att => {
                  const [attName, attUrl] = att.split('|');
                  const resolved = resolveUrl(attUrl);
                  const isFile = isFilePath(attUrl);
                  return (
                    <div key={att} className="tdm-att-item">
                      <span className="tdm-att-icon">
                        {isFile ? getFileIcon(attName) : <ExternalLink size={13}/>}
                      </span>
                      <a
                        href={resolved}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tdm-att-link"
                        title={attName}
                      >
                        {attName}
                      </a>
                      <span className="tdm-att-type">{isFile ? 'file' : 'url'}</span>
                      {isEditing && (
                        <button
                          type="button"
                          className="tdm-att-remove"
                          onClick={() => handleRemoveAttachment(att)}
                        >
                          <X size={11}/>
                        </button>
                      )}
                    </div>
                  );
                })}
                {attachments.length === 0 && (
                  <span className="tdm-empty-hint">No attachments yet.</span>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar column */}
          <aside className="tdm-sidebar">

            {/* ── Priority ────────────────────────────────────────────── */}
            <div className="tdm-sb-group">
              <div className="tdm-sb-label"><AlertCircle size={13}/> Priority</div>
              {isEditing ? (
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as typeof PRIORITIES[number])}
                  className="tdm-select"
                  style={{ color: pMeta.color }}
                >
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                  ))}
                </select>
              ) : (
                <span
                  className="tdm-priority-chip"
                  style={{ color: pMeta.color, background: pMeta.bg, borderColor: pMeta.color + '33' }}
                >
                  {pMeta.label}
                </span>
              )}
            </div>

            {/* ── Due Date ─────────────────────────────────────────────── */}
            <div className="tdm-sb-group">
              <div className="tdm-sb-label"><Calendar size={13}/> Due Date</div>
              {isEditing ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="tdm-date-input"
                />
              ) : (
                <span className={`tdm-date-chip ${task.dueDate && new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                  {dueDate
                    ? new Date(dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : <span className="tdm-empty-hint">Not set</span>
                  }
                </span>
              )}
            </div>

            {/* ── Assignees ────────────────────────────────────────────── */}
            <div className="tdm-sb-group">
              <div className="tdm-sb-label"><User size={13}/> Assignees</div>
              <div className="tdm-assignees">
                {activeBoard?.members.map(member => {
                  const checked = assignedTo.includes(member.user.id);
                  return isEditing ? (
                    <label key={member.user.id} className="tdm-assignee-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setAssignedTo(prev =>
                            checked
                              ? prev.filter(id => id !== member.user.id)
                              : [...prev, member.user.id]
                          );
                        }}
                        className="tdm-checkbox"
                      />
                      <span className="tdm-assignee-avatar">
                        {member.user.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="tdm-assignee-name">{member.user.name}</span>
                    </label>
                  ) : checked ? (
                    <div key={member.user.id} className="tdm-assignee-row-view" title={member.user.name}>
                      <span className="tdm-assignee-avatar">{member.user.name.charAt(0).toUpperCase()}</span>
                      <span className="tdm-assignee-name">{member.user.name}</span>
                    </div>
                  ) : null;
                })}
                {!isEditing && assignedTo.length === 0 && (
                  <span className="tdm-empty-hint">Unassigned</span>
                )}
                {(!activeBoard?.members || activeBoard.members.length === 0) && (
                  <span className="tdm-empty-hint">No board members</span>
                )}
              </div>
            </div>

            {/* ── Error ────────────────────────────────────────────────── */}
            {errorMsg && <div className="tdm-error">{errorMsg}</div>}

            {/* ── Delete ───────────────────────────────────────────────── */}
            <div style={{ marginTop: 'auto' }}>
              <button type="button" className="btn-delete-task" onClick={handleDelete}>
                <Trash2 size={14}/>
                <span>Delete Task</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TaskDetailModal;
