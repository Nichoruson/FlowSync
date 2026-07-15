import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, setAccessToken } from '../hooks/useApiClient';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name?: string, currentPassword?: string, newPassword?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let activeInitPromise: Promise<any> | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Silent refresh on startup
  useEffect(() => {
    const initAuth = async () => {
      if (!activeInitPromise) {
        activeInitPromise = apiClient.post('/auth/refresh');
      }
      try {
        const res = await activeInitPromise;
        const newToken = res.data.data.token;
        const newUser = res.data.data.user;
        setAccessToken(newToken);
        setTokenState(newToken);
        setUser(newUser);
      } catch (err) {
        // Refresh token not present or expired
        setAccessToken(null);
        setTokenState(null);
        setUser(null);
      } finally {
        activeInitPromise = null; // Reset for any future mounts/retries
        setLoading(false);
      }
    };

    initAuth();

    // Listen for session expiry event from apiClient
    const handleSessionExpired = () => {
      setAccessToken(null);
      setTokenState(null);
      setUser(null);
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data.data;
    setAccessToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apiClient.post('/auth/register', { name, email, password });
    const { token: newToken, user: newUser } = res.data.data;
    setAccessToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  };

  const googleLogin = async (credential: string) => {
    const res = await apiClient.post('/auth/google', { credential });
    const { token: newToken, user: newUser } = res.data.data;
    setAccessToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      setAccessToken(null);
      setTokenState(null);
      setUser(null);
    }
  };

  const updateProfile = async (name?: string, currentPassword?: string, newPassword?: string) => {
    const res = await apiClient.put('/auth/profile', { name, currentPassword, newPassword });
    const updatedUser = res.data.data;
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        googleLogin,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
