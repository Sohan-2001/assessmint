
"use client";

import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@/lib/types'; // Import local Role

export type UserRole = Role | null; // Use local Role enum

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  userId: string | null;
  isLoading: boolean;
  login: (role: UserRole, userId: string, redirectPath?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedAuthRaw = localStorage.getItem('assessMintAuth');
      if (storedAuthRaw) {
        const storedAuth = JSON.parse(storedAuthRaw);
        if (storedAuth.role && storedAuth.id && Object.values(Role).includes(storedAuth.role)) {
          setIsAuthenticated(true);
          setUserRole(storedAuth.role as Role);
          setUserId(storedAuth.id);
        } else {
          console.warn("Invalid auth state in localStorage, removing.");
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
    if (role && Object.values(Role).includes(role)) {
      setIsAuthenticated(true);
      setUserRole(role);
      setUserId(id);
      localStorage.setItem('assessMintAuth', JSON.stringify({ role, id }));
      if (redirectPath) {
        router.push(redirectPath);
      } else {
        router.push(role === Role.SETTER ? '/setter/dashboard' : '/taker/exams');
      }
    } else {
      console.error("Invalid role provided to login function:", role);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
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
