
"use client";

import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'setter' | 'taker' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  userId: string | null;
  token: string | null; // Added token
  isLoading: boolean;
  login: (role: UserRole, userId: string, token: string, redirectPath?: string) => void; // Added token to login
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null); // Added token state
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedAuthRaw = localStorage.getItem('assessMintAuth');
      if (storedAuthRaw) {
        const storedAuth = JSON.parse(storedAuthRaw);
        if (storedAuth.role && storedAuth.id && storedAuth.token) {
          setIsAuthenticated(true);
          setUserRole(storedAuth.role);
          setUserId(storedAuth.id);
          setToken(storedAuth.token); // Set token from localStorage
        } else {
          // If data is incomplete, clear it
          localStorage.removeItem('assessMintAuth');
        }
      }
    } catch (error) {
      console.warn("Could not load auth state from localStorage", error);
      localStorage.removeItem('assessMintAuth');
    }
    setIsLoading(false);
  }, []);

  const login = (role: UserRole, id: string, jwtToken: string, redirectPath?: string) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setUserId(id);
    setToken(jwtToken); // Set token
    localStorage.setItem('assessMintAuth', JSON.stringify({ role, id, token: jwtToken })); // Store token
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
    setToken(null); // Clear token
    localStorage.removeItem('assessMintAuth');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, userId, token, isLoading, login, logout }}>
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
