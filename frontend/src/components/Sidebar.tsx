import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useBoardStore } from '../store/boardStore';
import { useAuth } from '../context/AuthContext';
import {
  Plus, LogOut, ChevronLeft, ChevronRight,
  FolderKanban, Grid3X3, X, Zap,
} from 'lucide-react';

interface SidebarProps {
  activeBoardId?: string;
}

const COLOR_PRESETS = [
  { value: '#6366f1', label: 'Indigo'   },
  { value: '#8b5cf6', label: 'Purple'   },
  { value: '#06b6d4', label: 'Cyan'     },
  { value: '#10b981', label: 'Emerald'  },
  { value: '#f59e0b', label: 'Amber'    },
  { value: '#ef4444', label: 'Red'      },
  { value: '#ec4899', label: 'Pink'     },
  { value: '#0ea5e9', label: 'Sky'      },
  { value: '#a855f7', label: 'Violet'   },
  { value: '#14b8a6', label: 'Teal'     },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeBoardId }) => {
  const { boards, createBoard } = useBoardStore();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Board creation form state
  const [newTitle, setNewTitle]       = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [newColor, setNewColor]       = useState(COLOR_PRESETS[0].value);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState('');

  const openModal = () => {
    setNewTitle('');
    setNewDesc('');
    setNewColor(COLOR_PRESETS[0].value);
    setCreateError('');
    setShowCreateModal(true);
  };

  const closeModal = () => setShowCreateModal(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) { setCreateError('Board title is required'); return; }
    setCreating(true);
    setCreateError('');
    try {
      await createBoard(newTitle.trim(), newDesc.trim() || undefined, newColor);
      closeModal();
    } catch {
      setCreateError('Failed to create board. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className={`board-sidebar ${collapsed ? 'collapsed' : ''}`}>

      {/* ── Brand row ─────────────────────────────────────────────────── */}
      <div className="sidebar-brand-row">
        {!collapsed && (
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
            }}>
              <Zap size={14} color="white" />
            </div>
            <span className="logo-text">FlowSync</span>
          </div>
        )}
        <button className="collapse-toggle-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className="sidebar-nav">
        <a href="#/" className="sidebar-nav-link">
          <Grid3X3 size={18} />
          {!collapsed && <span>Dashboard</span>}
        </a>

        <div className="sidebar-section-header">
          {!collapsed && <span>My Boards</span>}
          {!collapsed && (
            <button className="inline-add-board-btn" onClick={openModal} title="New Board">
              <Plus size={15} />
            </button>
          )}
        </div>

        <div className="sidebar-boards-list">
          {boards.map(b => (
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

          {!collapsed && boards.length === 0 && (
            <button
              className="sidebar-empty-create-btn"
              onClick={openModal}
            >
              <Plus size={13} />
              <span>Create your first board</span>
            </button>
          )}
        </div>

        {collapsed && (
          <button
            className="sidebar-nav-link"
            style={{ border: 'none', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
            onClick={openModal}
            title="New Board"
          >
            <Plus size={18} />
          </button>
        )}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="sidebar-footer">
        <a href="#/profile" className="sidebar-user-info" title={user?.name}>
          <div className="sidebar-user-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="user-text">
              <span className="user-name">{user?.name}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          )}
        </a>

        <button onClick={logout} className="sidebar-logout-btn" title="Logout">
          <LogOut size={17} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* ── Create Board Modal ─────────────────────────────────────── */}
      {showCreateModal && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={closeModal}>
          <div className="create-board-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="cbm-header">
              <div className="cbm-header-icon" style={{ background: `linear-gradient(135deg, ${newColor}, ${newColor}99)` }}>
                <FolderKanban size={20} color="white" />
              </div>
              <div className="cbm-header-text">
                <h3>Create New Board</h3>
                <p>Organize your work into a collaborative board</p>
              </div>
              <button className="close-btn" onClick={closeModal}>
                <X size={16} />
              </button>
            </div>

            {/* Color preview bar */}
            <div className="cbm-color-bar" style={{ background: `linear-gradient(90deg, ${newColor}, ${newColor}55)` }} />

            {/* Form */}
            <form onSubmit={handleCreate} className="cbm-form">
              <div className="form-group">
                <label htmlFor="cbm-title">
                  Board Title <span className="required-mark">*</span>
                </label>
                <input
                  id="cbm-title"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Product Roadmap, Sprint Planning…"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  autoFocus
                  maxLength={80}
                />
              </div>

              <div className="form-group">
                <label htmlFor="cbm-desc">
                  Description <span className="optional-mark">(optional)</span>
                </label>
                <textarea
                  id="cbm-desc"
                  className="input-field"
                  placeholder="What is this board for?"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  maxLength={300}
                />
              </div>

              <div className="form-group">
                <label>Board Color / Theme</label>
                <div className="cbm-color-grid">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      className={`color-preset-btn ${newColor === preset.value ? 'selected' : ''}`}
                      style={{ background: preset.value }}
                      title={preset.label}
                      onClick={() => setNewColor(preset.value)}
                    />
                  ))}
                  <input
                    type="color"
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    className="cbm-custom-color"
                    title="Custom color"
                  />
                </div>
              </div>

              {createError && (
                <div className="error-banner">{createError}</div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !newTitle.trim()}
                  style={{ background: `linear-gradient(135deg, ${newColor}, ${newColor}cc)` }}
                >
                  <FolderKanban size={15} />
                  <span>{creating ? 'Creating…' : 'Create Board'}</span>
                </button>
              </div>
            </form>
          </div>
      </div>,
      document.body
    )}
    </aside>
  );
};

export default Sidebar;
