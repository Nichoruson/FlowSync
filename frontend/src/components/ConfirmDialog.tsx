import React from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

interface ConfirmDialogProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onCancel}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '360px',
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-surface, #1e1e2d)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444'
          }}>
            <AlertCircle size={16} />
          </div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-bright)' }}>
            {title}
          </h4>
        </div>

        <p style={{ margin: '0 0 1.2rem 0', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            onClick={onCancel}
          >
            <X size={13} /> {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }}
            onClick={onConfirm}
          >
            <Check size={13} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
