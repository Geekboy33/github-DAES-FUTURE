/**
 * Authentication Context
 * Manejo del estado de autenticación global
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('daes_authenticated') === 'true';
  });
  
  const [user, setUser] = useState<string | null>(() => {
    return localStorage.getItem('daes_user');
  });

  const login = () => {
    setIsAuthenticated(true);
    setUser(localStorage.getItem('daes_user'));
  };

  const logout = () => {
    localStorage.removeItem('daes_authenticated');
    localStorage.removeItem('daes_user');
    localStorage.removeItem('daes_login_time');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Auto-logout después de 12 horas
  useEffect(() => {
    if (isAuthenticated) {
      const loginTime = localStorage.getItem('daes_login_time');
      if (loginTime) {
        const elapsed = Date.now() - new Date(loginTime).getTime();
        const twelveHours = 12 * 60 * 60 * 1000;
        
        if (elapsed > twelveHours) {
          logout();
        } else {
          const remaining = twelveHours - elapsed;
          const timeout = setTimeout(logout, remaining);
          return () => clearTimeout(timeout);
        }
      }
    }
  }, [isAuthenticated]);

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

