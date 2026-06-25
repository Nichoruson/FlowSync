import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ParticleBackground } from '../ParticleBackground';
import { Mail, Zap, Loader2, CheckCircle, XCircle, ShieldAlert, LogOut } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AcceptInvitePageProps {
  token: string;
}

export const AcceptInvitePage: React.FC<AcceptInvitePageProps> = ({ token }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<{ email: string; boardTitle: string; invitedBy: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.');
      setLoading(false);
      return;
    }

    const fetchInvite = async () => {
      try {
        const res = await axios.get(`${API_URL}/invitations/${token}`);
        if (res.data.success) {
          setInviteDetails(res.data.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to retrieve invitation details. It may be expired or invalid.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleRespond = async (action: 'ACCEPT' | 'DECLINE') => {
    setResponding(true);
    setError(null);
    try {
      const authToken = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/invitations/${token}/respond`,
        { action },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (res.data.success) {
        if (action === 'ACCEPT') {
          setSuccessMsg('Invitation accepted successfully! Redirecting you to the board...');
          setTimeout(() => {
            window.location.hash = `#/board/${res.data.data.boardId}`;
          }, 2000);
        } else {
          setSuccessMsg('Invitation declined. Redirecting you to your dashboard...');
          setTimeout(() => {
            window.location.hash = '#/';
          }, 2000);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while responding to the invitation.');
      setResponding(false);
    }
  };

  const handleWrongAccountLogout = async () => {
    try {
      await logout();
      window.location.reload(); // Reload to clear states and show register screen
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ParticleBackground />

      <div className="auth-wrapper" style={{ position: 'relative', zIndex: 1 }}>
        <div className="auth-card glass-panel" style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.6)', maxWidth: '450px' }}>
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Zap size={22} color="white" />
            </div>
            <span className="auth-logo-text">FlowSync</span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Mail size={20} color="var(--color-primary)" />
              <span>Project Invitation</span>
            </h2>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0' }}>
              <Loader2 size={36} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verifying invitation details...</span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#fca5a5',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>

              {/* If logged in under different account, show helper logout button */}
              {user && inviteDetails && user.email.toLowerCase() !== inviteDetails.email.toLowerCase() && (
                <button
                  onClick={handleWrongAccountLogout}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem' }}
                >
                  <LogOut size={15} />
                  <span>Log Out & Use Correct Email</span>
                </button>
              )}

              <a href="#/" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.6rem', marginTop: '0.5rem' }}>
                Go to Dashboard
              </a>
            </div>
          ) : successMsg ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0', textAlign: 'center' }}>
              <CheckCircle size={48} color="#10b981" />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>{successMsg}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', textAlign: 'center', lineHeight: '1.5' }}>
                <strong>{inviteDetails?.invitedBy}</strong> has invited you to collaborate on the project board:
              </p>

              <div style={{
                padding: '1rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                color: 'var(--color-primary)',
                textShadow: '0 0 10px rgba(99,102,241,0.2)',
              }}>
                {inviteDetails?.boardTitle}
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Signed in as: <strong>{user?.email}</strong>
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => handleRespond('DECLINE')}
                  disabled={responding}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', padding: '0.65rem' }}
                >
                  <XCircle size={15} />
                  <span>Decline</span>
                </button>
                <button
                  onClick={() => handleRespond('ACCEPT')}
                  disabled={responding}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '0.65rem' }}
                >
                  {responding ? <Loader2 size={15} style={{ animation: 'spin 1s linear' }} /> : <CheckCircle size={15} />}
                  <span>Accept Project</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
