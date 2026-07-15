import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught rendering error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '260px',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          gap: '1rem',
          margin: '1rem auto',
          maxWidth: '500px',
        }}>
          <AlertTriangle size={36} color="#ef4444" />
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-bright)', marginBottom: '0.4rem' }}>
              Something went wrong
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              An unexpected render error occurred in this view. You can retry rendering or refresh the application.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={this.handleReset}
              className="btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', gap: '0.35rem' }}
            >
              <RefreshCw size={13} />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
