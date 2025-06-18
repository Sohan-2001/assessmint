
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
    console.log("AuthContext: Initializing and loading from localStorage...");
    try {
      const storedAuthRaw = localStorage.getItem('assessMintAuth');
      if (storedAuthRaw) {
        const storedAuth = JSON.parse(storedAuthRaw);
        console.log("AuthContext: Found in localStorage:", storedAuth);
        // Explicitly check if role is one of the defined enum values
        if (storedAuth.id && storedAuth.role && (storedAuth.role === Role.SETTER || storedAuth.role === Role.TAKER)) {
          setIsAuthenticated(true);
          setUserRole(storedAuth.role); // No need to cast due to explicit check
          setUserId(storedAuth.id);
          console.log("AuthContext: State loaded from localStorage:", { role: storedAuth.role, id: storedAuth.id });
        } else {
          console.warn("AuthContext: Invalid auth state in localStorage (role/id invalid, missing, or role not in enum), removing.", storedAuth);
          localStorage.removeItem('assessMintAuth');
          // Ensure state is reset
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
        }
      } else {
        console.log("AuthContext: No auth state found in localStorage.");
      }
    } catch (error) {
      console.warn("AuthContext: Could not load auth state from localStorage (parse error or other). Removing item.", error);
      localStorage.removeItem('assessMintAuth');
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
    }
    setIsLoading(false);
    console.log("AuthContext: Initialization complete. isLoading:", false);
  }, []);

  const login = (role: UserRole, id: string, redirectPath?: string) => {
    console.log("AuthContext: login called with role:", role, "userId:", id);
    if (role && (role === Role.SETTER || role === Role.TAKER) && id) {
      setIsAuthenticated(true);
      setUserRole(role);
      setUserId(id);
      localStorage.setItem('assessMintAuth', JSON.stringify({ role, id }));
      console.log("AuthContext: State set and localStorage updated:", { role, id });
      if (redirectPath) {
        router.push(redirectPath);
      } else {
        router.push(role === Role.SETTER ? '/setter/dashboard' : '/taker/exams');
      }
    } else {
      console.error("AuthContext: login called with invalid role or id. Role:", role, "ID:", id);
      // Optionally reset state if login attempt is invalid
      // logout(); 
    }
  };

  const logout = () => {
    console.log("AuthContext: logout called.");
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
