import React, { useState, useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { BoardPage } from './BoardPage';
import { ProfilePage } from './pages/ProfilePage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';

export const Router: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Parse path and params
  const path = route.slice(1) || '/';
  
  if (path === '/' || path === '') {
    return <HomePage />;
  }

  if (path === '/profile') {
    return <ProfilePage />;
  }

  if (path.startsWith('/board/')) {
    const boardId = path.split('/board/')[1];
    return <BoardPage boardId={boardId} />;
  }

  if (path.startsWith('/accept-invite')) {
    const queryString = route.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    const token = params.get('token') || '';
    return <AcceptInvitePage token={token} />;
  }

  // Fallback
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '1rem', color: 'var(--text-primary)' }}>
      <h2>404 — Page Not Found</h2>
      <a href="#/" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Go back to dashboard</a>
    </div>
  );
};
