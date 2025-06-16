
"use client";

import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type UserRole = 'setter' | 'taker' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  isLoading: boolean;
  login: (role: UserRole, redirectPath?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Simulate checking auth status from localStorage or a cookie
    try {
      const storedAuth = localStorage.getItem('assessMintAuth');
      if (storedAuth) {
        const { role } = JSON.parse(storedAuth);
        setIsAuthenticated(true);
        setUserRole(role);
      }
    } catch (error) {
      // Invalid item in localStorage or localStorage not available
      console.warn("Could not load auth state from localStorage", error);
      localStorage.removeItem('assessMintAuth'); // Clear potentially corrupted item
    }
    setIsLoading(false);
  }, []);

  const login = (role: UserRole, redirectPath?: string) => {
    setIsAuthenticated(true);
    setUserRole(role);
    localStorage.setItem('assessMintAuth', JSON.stringify({ role }));
    if (redirectPath) {
      router.push(redirectPath);
    } else {
      router.push(role === 'setter' ? '/setter/dashboard' : '/taker/exams');
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    localStorage.removeItem('assessMintAuth');
    router.push('/'); // Always redirect to home on logout
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, isLoading, login, logout }}>
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
