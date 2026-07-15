import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ParticleBackground } from './ParticleBackground';
import { Mail, Lock, User, Zap, Loader2, ArrowRight, ShieldAlert } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register, googleLogin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<{ email: string; boardTitle: string; invitedBy: string } | null>(null);

  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('/accept-invite')) {
      const queryString = hash.split('?')[1] || '';
      const params = new URLSearchParams(queryString);
      const token = params.get('token');
      if (token) {
        setIsLogin(false); // Automatically switch to sign up
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        fetch(`${API_URL}/invitations/${token}`)
          .then(res => res.json())
          .then(res => {
            if (res.success && res.data) {
              setInviteDetails(res.data);
              setEmail(res.data.email);
            }
          })
          .catch(err => console.error('Error fetching invite details', err));
      }
    }
  }, []);

  // Initialize Google Identity Services SDK
  React.useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCallback,
        });

        const btnEl = document.getElementById('google-signin-btn-container');
        if (btnEl) {
          (window as any).google.accounts.id.renderButton(btnEl, {
            theme: 'filled_black',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            shape: 'pill',
          });
        }
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGoogleCallback = async (response: any) => {
    if (response?.credential) {
      setSubmitting(true);
      setError(null);
      try {
        await googleLogin(response.credential);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Google authentication failed.');
      } finally {
        setSubmitting(false);
      }
    }
  };
  
  // Field validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: '', color: '', width: '0%' };
    if (pwd.length < 8) return { label: 'Weak (min 8 characters)', color: '#ef4444', width: '33%' };
    const hasDigit = /[0-9]/.test(pwd);
    if (hasDigit) return { label: 'Strong', color: '#10b981', width: '100%' };
    return { label: 'Medium (add a number)', color: '#f59e0b', width: '66%' };
  };

  const validateFields = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setNameError('');

    // Email
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    // Password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (!isLogin && password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      isValid = false;
    } else if (!isLogin && !/[0-9]/.test(password)) {
      setPasswordError('Password must contain at least one number');
      isValid = false;
    }

    // Name
    if (!isLogin && !name.trim()) {
      setNameError('Name is required');
      isValid = false;
    } else if (!isLogin && name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateFields()) return;

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
    setEmailError('');
    setPasswordError('');
    setNameError('');
    setEmail('');
    setPassword('');
    setName('');
  };

  const strength = getPasswordStrength(password);

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

          {/* Invitation Banner */}
          {inviteDetails && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1.25rem',
              textAlign: 'center',
              fontSize: '0.82rem',
              color: '#a5b4fc'
            }}>
              ✉️ <strong>{inviteDetails.invitedBy}</strong> has invited you to join the board <strong>"{inviteDetails.boardTitle}"</strong>. Please sign up or sign in below to accept.
            </div>
          )}

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

          {/* Official Google Sign In Container */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div
              id="google-signin-btn-container"
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                minHeight: '40px',
              }}
            />
            {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <div style={{
                textAlign: 'center',
                padding: '0.6rem 0.8rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px dashed rgba(255, 255, 255, 0.15)',
              }}>
                Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code> to render Google OAuth button.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '0.75rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
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

          {/* General API error */}
          {error && (
            <div style={{
              padding: '0.7rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5',
              fontSize: '0.83rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ShieldAlert size={16} />
              <span>{error}</span>
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
                    className={`input-field ${nameError ? 'error' : ''}`}
                    style={{ paddingLeft: '2.5rem' }}
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      if (e.target.value.trim().length >= 2) setNameError('');
                    }}
                  />
                </div>
                {nameError && <div className="inline-error-msg">{nameError}</div>}
              </div>
            )}

            <div>
              <div className="label-xs">Email Address</div>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`input-field ${emailError ? 'error' : ''}`}
                  style={{ paddingLeft: '2.5rem' }}
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) setEmailError('');
                  }}
                />
              </div>
              {emailError && <div className="inline-error-msg">{emailError}</div>}
            </div>

            <div>
              <div className="label-xs">Password</div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', pointerEvents: 'none' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className={`input-field ${passwordError ? 'error' : ''}`}
                  style={{ paddingLeft: '2.5rem' }}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (isLogin && e.target.value.length > 0) setPasswordError('');
                    if (!isLogin && e.target.value.length >= 8 && /[0-9]/.test(e.target.value)) setPasswordError('');
                  }}
                />
              </div>
              {passwordError && <div className="inline-error-msg">{passwordError}</div>}
            </div>

            {/* Password strength bar */}
            {!isLogin && password && (
              <div className="strength-container" style={{ marginTop: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px', color: 'var(--text-muted)' }}>
                  <span>Password Strength:</span>
                  <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                </div>
                <div style={{ height: '5px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: strength.width, backgroundColor: strength.color, transition: 'all 0.3s ease' }}></div>
                </div>
              </div>
            )}

            {/* Forgot password link placeholder */}
            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: '-0.2rem' }}>
                <span
                  style={{ fontSize: '0.75rem', color: 'var(--text-dark)', cursor: 'not-allowed', textDecoration: 'none', opacity: 0.5 }}
                  title="Password reset service not configured"
                >
                  Forgot password? (Unavailable)
                </span>
              </div>
            )}

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

export default AuthPage;
