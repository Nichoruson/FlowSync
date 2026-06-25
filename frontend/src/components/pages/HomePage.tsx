import React, { useEffect, useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { useAuth } from '../../context/AuthContext';
import { Plus, User, LogOut, Calendar, ArrowRight, FolderKanban } from 'lucide-react';

const PRESETS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ef4444', // Red
];

export const HomePage: React.FC = () => {
  const { boards, fetchBoards, createBoard, loading, error } = useBoardStore();
  const { user, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESETS[0]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createBoard(title, description, selectedColor);
    setTitle('');
    setDescription('');
    setSelectedColor(PRESETS[0]);
    setShowModal(false);
  };

  return (
    <div className="homepage-container">
      {/* Navbar Header */}
      <header className="home-header">
        <div className="brand">
          <FolderKanban className="logo-icon animate-pulse" />
          <span className="logo-text">FlowSync</span>
        </div>
        <div className="user-controls">
          <a href="#/profile" className="profile-btn">
            <User size={18} />
            <span>{user?.name}</span>
          </a>
          <button onClick={logout} className="logout-btn">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Welcome back, <span className="highlight">{user?.name}</span></h1>
          <p>Organize, track, and sync your team's workflows in real time.</p>
        </div>
      </section>

      {/* Main Boards Section */}
      <main className="boards-main">
        <div className="section-title-row">
          <h2>Your Boards</h2>
          <button onClick={() => setShowModal(true)} className="create-board-btn">
            <Plus size={18} />
            <span>Create New Board</span>
          </button>
        </div>

        {error && <div className="error-toast">{error}</div>}

        {loading ? (
          <div className="boards-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="board-card skeleton" style={{ height: '160px' }}></div>
            ))}
          </div>
        ) : (
          <div className="boards-grid">
            {/* Create Board Card Button */}
            <div className="board-card create-trigger" onClick={() => setShowModal(true)}>
              <Plus size={36} className="trigger-icon" />
              <span>Create New Board</span>
            </div>

            {/* Board Cards */}
            {boards.map((board) => (
              <a
                key={board.id}
                href={`#/board/${board.id}`}
                className="board-card hover-lift"
                style={{
                  borderLeft: `6px solid ${board.color || '#6366f1'}`,
                }}
              >
                <div className="board-card-content">
                  <h3 className="board-card-title">{board.title}</h3>
                  <p className="board-card-desc">
                    {board.description || 'No description provided.'}
                  </p>
                  <div className="board-card-footer">
                    <span className="board-card-date">
                      <Calendar size={14} />
                      {new Date(board.createdAt).toLocaleDateString()}
                    </span>
                    <span className="open-arrow">
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      {/* Create Board Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </div>
              <div>
                <h3>Create New Board</h3>
                <p className="modal-header-subtitle">Set up your workspace and start organizing tasks</p>
              </div>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="board-title">Board Title <span className="required-mark">*</span></label>
                <input
                  id="board-title"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Product Roadmap, Sprint Q3..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="board-desc">Description <span className="optional-mark">(optional)</span></label>
                <textarea
                  id="board-desc"
                  className="input-field"
                  placeholder="What is this board for? Give your team context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Theme Color</label>
                <div className="color-picker-grid">
                  {PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-preset-btn ${selectedColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
                <div className="color-preview-bar" style={{ background: selectedColor }} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
