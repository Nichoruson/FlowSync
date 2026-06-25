import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Grid3X3,
} from 'lucide-react';

interface SidebarProps {
  activeBoardId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeBoardId }) => {
  const { boards, createBoard } = useBoardStore();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createBoard(newTitle);
    setNewTitle('');
    setShowCreateModal(false);
  };

  return (
    <aside className={`board-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand logo */}
      <div className="sidebar-brand-row">
        {!collapsed && (
          <div className="brand">
            <FolderKanban className="logo-icon" />
            <span className="logo-text">FlowSync</span>
          </div>
        )}
        <button className="collapse-toggle-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav list */}
      <nav className="sidebar-nav">
        <a href="#/" className="sidebar-nav-link">
          <Grid3X3 size={20} />
          {!collapsed && <span>Dashboard</span>}
        </a>

        <div className="sidebar-section-header">
          {!collapsed && <span>My Boards</span>}
          {!collapsed && (
            <button className="inline-add-board-btn" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* Boards List */}
        <div className="sidebar-boards-list">
          {boards.map((b) => (
            <a
              key={b.id}
              href={`#/board/${b.id}`}
              className={`sidebar-board-link ${activeBoardId === b.id ? 'active' : ''}`}
              title={b.title}
            >
              <span
                className="board-color-indicator"
                style={{ backgroundColor: b.color || '#6366f1' }}
              />
              {!collapsed && <span className="board-link-title">{b.title}</span>}
            </a>
          ))}
        </div>
      </nav>

      {/* Footer controls */}
      <div className="sidebar-footer">
        <a href="#/profile" className="sidebar-user-info" title={user?.name}>
          <User size={20} />
          {!collapsed && (
            <div className="user-text">
              <span className="user-name">{user?.name}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          )}
        </a>

        <button onClick={logout} className="sidebar-logout-btn" title="Logout">
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Quick create modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Board</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-group">
                <label>Board Title</label>
                <input
                  type="text"
                  placeholder="Enter board title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
