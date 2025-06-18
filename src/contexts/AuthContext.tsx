
"use client";

import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'setter' | 'taker' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  userId: string | null;
  // Removed token
  isLoading: boolean;
  login: (role: UserRole, userId: string, redirectPath?: string) => void; // Removed token from login
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // Removed token state
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedAuthRaw = localStorage.getItem('assessMintAuth');
      if (storedAuthRaw) {
        const storedAuth = JSON.parse(storedAuthRaw);
        // Updated to check for id and role only
        if (storedAuth.role && storedAuth.id) {
          setIsAuthenticated(true);
          setUserRole(storedAuth.role);
          setUserId(storedAuth.id);
          // Removed token loading
        } else {
          localStorage.removeItem('assessMintAuth');
        }
      }
    } catch (error) {
      console.warn("Could not load auth state from localStorage", error);
      localStorage.removeItem('assessMintAuth');
    }
    setIsLoading(false);
  }, []);

  const login = (role: UserRole, id: string, redirectPath?: string) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setUserId(id);
    // Removed token setting
    localStorage.setItem('assessMintAuth', JSON.stringify({ role, id })); // Store without token
    if (redirectPath) {
      router.push(redirectPath);
    } else {
      router.push(role === 'setter' ? '/setter/dashboard' : '/taker/exams');
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    // Removed token clearing
    localStorage.removeItem('assessMintAuth');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, userId, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
