import React, { createContext, useContext, useMemo, useState } from 'react';

export interface CurrentUser {
  id?: number;
  email?: string;
  full_name?: string;
  role?: 'ADMIN' | 'ADVISOR' | 'STUDENT' | string;
  student_id?: number | null;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
}

interface AuthContextValue {
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  role: string;
  login: (user: CurrentUser) => void;
  logout: () => void;
}

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const normalizeUser = (user: CurrentUser | null) =>
  user ? { ...user, role: String(user.role || '').trim().toUpperCase() } : null;

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() =>
    normalizeUser(readStoredUser())
  );

  const login = (user: CurrentUser) => {
    const normalizedUser = normalizeUser(user);
    setCurrentUser(normalizedUser);
    if (normalizedUser) {
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(localStorage.getItem('token') && currentUser),
      role: String(currentUser?.role || '').trim().toUpperCase(),
      login,
      logout,
    }),
    [currentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
};
