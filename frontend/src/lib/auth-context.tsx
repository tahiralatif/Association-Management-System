"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  /** Check if current user has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if current user is admin (super_admin or tenant_admin) */
  isAdmin: boolean;
  /** Check if current user is staff or above */
  isStaff: boolean;
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

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    return user.permissions?.includes(permission) ?? false;
  }, [user]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return (
      user.permissions?.includes("admin:all") ||
      user.roles?.includes("super_admin") ||
      user.roles?.includes("tenant_admin")
    ) ?? false;
  }, [user]);

  const isStaff = useMemo(() => {
    if (!user) return false;
    return (
      user.permissions?.includes("admin:all") ||
      user.roles?.some(r => ["super_admin", "tenant_admin", "staff"].includes(r))
    ) ?? false;
  }, [user]);

  const isAuthenticated = !!user && !!getToken();

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, hasPermission, isAdmin, isStaff, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
