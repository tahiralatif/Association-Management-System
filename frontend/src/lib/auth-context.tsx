"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getUser,
  setUser as storeUser,
  clearToken,
  setToken,
  getToken,
  type AuthUser,
} from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ["/", "/login", "/register", "/marketing", "/verify-email", "/why"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getToken();
    const stored = getUser();
    if (token && stored) {
      setUserState(stored);
    }
    setLoading(false);
  }, []);

  // Redirect unauthenticated users away from protected routes
  useEffect(() => {
    if (loading) return; // Don't redirect while still loading
    if (!user && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  const login = (u: AuthUser, token: string) => {
    // Token and user are already persisted by api.ts login/register
    // Just update React state
    setUserState(u);
  };

  const logout = () => {
    clearToken();
    setUserState(null);
    router.replace("/login");
  };

  const isAuthenticated = !!user && !!getToken();

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
