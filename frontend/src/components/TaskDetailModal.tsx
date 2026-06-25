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
  const [assignedTo, setAssignedTo] = useState(task.assignedTo || '');
  
  // Format due date for date input (YYYY-MM-DD)
  const initialDueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
  const [dueDate, setDueDate] = useState(initialDueDate);

  const [labels, setLabels] = useState<string[]>(task.labels || []);
  const [newLabel, setNewLabel] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        assignedTo: assignedTo || null,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labels,
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
              <label htmlFor="task-description">Description</label>
              <textarea
                id="task-description"
                placeholder="Add a more detailed description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
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

            {/* Assignee */}
            <div className="sidebar-group">
              <label><User size={16} /> Assignee</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="assignee-select"
              >
                <option value="">Unassigned</option>
                {activeBoard?.members.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name}
                  </option>
                ))}
              </select>
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
