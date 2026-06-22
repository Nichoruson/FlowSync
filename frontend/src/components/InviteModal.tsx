import React, { useState, useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';
import type { BoardMember } from '../store/boardStore';
import { useAuth } from '../context/AuthContext';
import { X, UserPlus, Mail, Trash2, Crown, Shield, User, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface InviteModalProps {
  boardId: string;
  onClose: () => void;
}

const getAvatarColor = (name: string) => {
  const colors = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #06b6d4, #0ea5e9)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ef4444, #dc2626)',
    'linear-gradient(135deg, #a855f7, #7c3aed)',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

const getRoleIcon = (role: string) => {
  if (role === 'OWNER') return <Crown size={12} />;
  if (role === 'ADMIN') return <Shield size={12} />;
  return <User size={12} />;
};

export const InviteModal: React.FC<InviteModalProps> = ({ boardId, onClose }) => {
  const { user } = useAuth();
  const { activeBoard } = useBoardStore();

  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<BoardMember[]>(activeBoard?.members || []);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Sync with store updates
  useEffect(() => {
    if (activeBoard?.members) {
      setMembers(activeBoard.members);
    }
  }, [activeBoard?.members]);

  const myRole = members.find(m => m.userId === user?.id)?.role;
  const isOwnerOrAdmin = myRole === 'OWNER' || myRole === 'ADMIN';

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/boards/${boardId}/members`,
        { email: email.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMembers(prev => [...prev, res.data.data]);
      setEmail('');
      showFeedback('success', `Invitation sent! They can now access this board.`);
    } catch (err: any) {
      showFeedback('error', err.response?.data?.message || 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (targetUserId: string, name: string) => {
    const isSelf = targetUserId === user?.id;
    const confirmMsg = isSelf
      ? 'Are you sure you want to leave this board?'
      : `Remove ${name} from this board?`;
    if (!confirm(confirmMsg)) return;

    setRemovingId(targetUserId);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/boards/${boardId}/members/${targetUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(prev => prev.filter(m => m.userId !== targetUserId));
      showFeedback('success', `${isSelf ? 'You left' : name + ' removed from'} the board`);
    } catch (err: any) {
      showFeedback('error', err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel glass-panel">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="modal-title">
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <UserPlus size={18} color="var(--color-primary)" />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem' }}>Manage Members</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'var(--font-body)' }}>
                {members.length} member{members.length !== 1 ? 's' : ''} · {activeBoard?.title}
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.7rem 1rem', borderRadius: '8px',
            background: feedback.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: feedback.type === 'success' ? '#6ee7b7' : '#fca5a5',
            fontSize: '0.85rem', animation: 'slideUp 0.3s ease'
          }}>
            <CheckCircle size={15} />
            {feedback.msg}
          </div>
        )}

        {/* Invite Form */}
        {isOwnerOrAdmin && (
          <div>
            <div className="label-xs">Invite by Email</div>
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Mail size={15} style={{
                  position: 'absolute', left: '0.75rem', top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-dark)'
                }} />
                <input
                  type="email"
                  placeholder="colleague@example.com"
                  className="input-field"
                  style={{ paddingLeft: '2.2rem' }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.65rem 1rem' }}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <UserPlus size={16} />}
                <span>{loading ? 'Inviting...' : 'Invite'}</span>
              </button>
            </form>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '0.4rem' }}>
              The user must already have a FlowSync account.
            </p>
          </div>
        )}

        {/* Members List */}
        <div>
          <div className="label-xs" style={{ marginBottom: '0.6rem' }}>Current Members</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {members.map(member => (
              <div key={member.userId} className="member-row">
                <div
                  className="presence-avatar"
                  style={{ background: getAvatarColor(member.user.name) }}
                  title={member.user.email}
                >
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {member.user.name}
                    {member.userId === user?.id && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)' }}>(you)</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.user.email}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span className={`role-badge ${member.role.toLowerCase()}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {getRoleIcon(member.role)}
                    {member.role}
                  </span>
                  {(isOwnerOrAdmin || member.userId === user?.id) && member.role !== 'OWNER' && (
                    <button
                      className="btn-icon danger"
                      onClick={() => handleRemove(member.userId, member.user.name)}
                      disabled={removingId === member.userId}
                      title={member.userId === user?.id ? 'Leave board' : 'Remove member'}
                    >
                      {removingId === member.userId
                        ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                        : <Trash2 size={13} />
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
