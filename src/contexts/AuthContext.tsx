
"use client";

import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Removed usePathname as it's not used

export type UserRole = 'setter' | 'taker' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  userId: string | null; // Added userId
  isLoading: boolean;
  login: (role: UserRole, userId: string, redirectPath?: string) => void; // Added userId to login
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userId, setUserId] = useState<string | null>(null); // Added userId state
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('assessMintAuth');
      if (storedAuth) {
        const { role, id } = JSON.parse(storedAuth); // Expect id (userId)
        setIsAuthenticated(true);
        setUserRole(role);
        setUserId(id); // Set userId from localStorage
      }
    } catch (error) {
      console.warn("Could not load auth state from localStorage", error);
      localStorage.removeItem('assessMintAuth');
    }
    setIsLoading(false);
  }, []);

  const login = (role: UserRole, id: string, redirectPath?: string) => { // Accept userId
    setIsAuthenticated(true);
    setUserRole(role);
    setUserId(id); // Set userId
    localStorage.setItem('assessMintAuth', JSON.stringify({ role, id })); // Store userId
    if (redirectPath) {
      router.push(redirectPath);
    } else {
      router.push(role === 'setter' ? '/setter/dashboard' : '/taker/exams');
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null); // Clear userId
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
