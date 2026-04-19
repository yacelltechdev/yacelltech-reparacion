"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  login: (username: string, role: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('yacell_auth');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const login = (username: string, role: any) => {
    const u = { username, role };
    setUser(u);
    localStorage.setItem('yacell_auth', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('yacell_auth');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
