import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBoardStore } from '../store/boardStore';
import { useSocket } from '../context/SocketContext';
import { InviteModal } from './InviteModal';
import {
  LogOut, Plus, UserPlus, Activity, FolderKanban,
  Wifi, WifiOff
} from 'lucide-react';

interface BoardHeaderProps {
  boardId: string;
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #06b6d4, #0ea5e9)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #a855f7, #7c3aed)',
  'linear-gradient(135deg, #ef4444, #dc2626)',
];

const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export const BoardHeader: React.FC<BoardHeaderProps> = ({ boardId }) => {
  const { logout, user } = useAuth();
  const { activeBoard, createColumn } = useBoardStore();
  const { onlineUsers, socket } = useSocket();

  const [newColTitle, setNewColTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColTitle.trim()) return;
    await createColumn(boardId, newColTitle.trim());
    setNewColTitle('');
    setIsAdding(false);
  };

  const isConnected = socket?.connected;

  // Deduplicate online users by userId
  const uniqueOnline = onlineUsers.filter(
    (u, i, arr) => arr.findIndex(x => x.userId === u.userId) === i
  );

  return (
    <>
      <div className="board-header glass-panel">
        {/* Left: Board info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.35)'
          }}>
            <FolderKanban size={20} color="white" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeBoard?.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {isConnected ? (
                  <>
                    <Wifi size={11} color="var(--color-success)" />
                    <span style={{ color: 'var(--color-success)' }}>Live sync active</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={11} color="var(--text-dark)" />
                    <span style={{ color: 'var(--text-dark)' }}>Connecting...</span>
                  </>
                )}
              </div>
              <span style={{ color: 'var(--text-dark)', fontSize: '0.72rem' }}>·</span>
              <Activity size={10} color="var(--text-dark)" />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dark)' }}>
                {activeBoard?.columns.length ?? 0} col · {activeBoard?.columns.reduce((a, c) => a + c.tasks.length, 0) ?? 0} tasks
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>

          {/* Online presence avatars */}
          {uniqueOnline.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dark)' }}>Online:</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {uniqueOnline.slice(0, 5).map((u, i) => (
                  <div
                    key={u.userId}
                    className="presence-avatar"
                    style={{
                      background: avatarColor(u.name),
                      marginLeft: i > 0 ? '-8px' : '0',
                      zIndex: 10 - i,
                    }}
                    title={`${u.name} (${u.email}) · online`}
                  >
                    {u.name.charAt(0).toUpperCase()}
                    <span className="online-dot" />
                  </div>
                ))}
                {uniqueOnline.length > 5 && (
                  <div
                    className="presence-avatar"
                    style={{ background: 'rgba(255,255,255,0.06)', marginLeft: '-8px', zIndex: 5, color: 'var(--text-muted)' }}
                  >
                    +{uniqueOnline.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="divider" />

          {/* Invite button */}
          <button
            className="btn-secondary"
            style={{ padding: '0.45rem 0.875rem', fontSize: '0.8rem' }}
            onClick={() => setShowInvite(true)}
          >
            <UserPlus size={15} />
            <span>Invite</span>
          </button>

          {/* Add column */}
          {isAdding ? (
            <form onSubmit={handleAddColumn} style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                type="text"
                placeholder="Column title..."
                className="input-field"
                style={{ padding: '0.4rem 0.7rem', fontSize: '0.82rem', width: '160px' }}
                value={newColTitle}
                onChange={e => setNewColTitle(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.4rem 0.875rem', fontSize: '0.82rem' }}>Add</button>
              <button type="button" className="btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.82rem' }} onClick={() => setIsAdding(false)}>✕</button>
            </form>
          ) : (
            <button className="btn-secondary" style={{ padding: '0.45rem 0.875rem', fontSize: '0.8rem' }} onClick={() => setIsAdding(true)}>
              <Plus size={15} />
              <span>Column</span>
            </button>
          )}

          <div className="divider" />

          {/* Member avatar (self) */}
          <div
            className="presence-avatar"
            style={{ background: avatarColor(user?.name || 'U'), cursor: 'default' }}
            title={`${user?.name} (${user?.email})`}
          >
            {user?.name.charAt(0).toUpperCase()}
          </div>

          {/* Logout */}
          <button
            className="btn-icon danger"
            onClick={logout}
            title="Sign Out"
            style={{ color: 'var(--text-dark)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {showInvite && (
        <InviteModal boardId={boardId} onClose={() => setShowInvite(false)} />
      )}
    </>
  );
};
