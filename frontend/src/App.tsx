import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AuthPage } from './components/AuthPage';
import { BoardPage } from './components/BoardPage';

const AppContent: React.FC = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', backgroundColor: 'var(--bg-app)',
        flexDirection: 'column', gap: '1rem'
      }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>
          Initializing FlowSync...
        </span>
      </div>
    );
  }

  if (!token) return <AuthPage />;

  return (
    <SocketProvider>
      <BoardPage />
    </SocketProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
