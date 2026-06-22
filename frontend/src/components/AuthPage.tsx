import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ParticleBackground } from './ParticleBackground';
import { Mail, Lock, User, Zap, Loader2, ArrowRight } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <ParticleBackground />

      <div className="auth-wrapper" style={{ position: 'relative', zIndex: 1 }}>
        <div className="auth-card glass-panel" style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.6)' }}>
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Zap size={22} color="white" />
            </div>
            <span className="auth-logo-text">FlowSync</span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {isLogin
                ? 'Sign in to access your collaborative boards.'
                : 'Join FlowSync and start collaborating in real-time.'}
            </p>
          </div>

          {/* Mode toggle tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-glass)',
            borderRadius: '10px',
            padding: '3px',
            marginBottom: '1.5rem',
          }}>
            {['Sign In', 'Sign Up'].map((label, i) => {
              const active = (i === 0) === isLogin;
              return (
                <button
                  key={label}
                  onClick={() => setIsLogin(i === 0)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    outline: 'none',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: active ? '#a5b4fc' : 'var(--text-muted)',
                    border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '0.7rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5',
              fontSize: '0.83rem',
              marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {!isLogin && (
              <div>
                <div className="label-xs">Full Name</div>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div>
              <div className="label-xs">Email Address</div>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus={isLogin}
                />
              </div>
            </div>

            <div>
              <div className="label-xs">Password</div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', pointerEvents: 'none' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ marginTop: '0.25rem', padding: '0.75rem', fontSize: '0.95rem', letterSpacing: '0.01em' }}
            >
              {submitting ? (
                <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={switchMode}
              style={{
                background: 'none', border: 'none',
                color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '0.82rem',
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
