"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * React hook for permission checking.
 * Returns memoized permission checkers to avoid re-renders.
 */
export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    const permissions = user?.permissions ?? [];
    const roles = user?.roles ?? [];

    return {
      /** Check single permission */
      can: (permission: string) => permissions.includes(permission),
      /** Check ANY of multiple permissions */
      canAny: (...perms: string[]) => perms.some(p => permissions.includes(p)),
      /** Check ALL of multiple permissions */
      canAll: (...perms: string[]) => perms.every(p => permissions.includes(p)),
      /** Is admin (super_admin or tenant_admin) */
      isAdmin: roles.includes("super_admin") || roles.includes("tenant_admin") || permissions.includes("admin:all"),
      /** Is staff or above */
      isStaff: roles.some(r => ["super_admin", "tenant_admin", "staff"].includes(r)),
      /** Is regular member */
      isMember: roles.includes("member"),
      /** Raw permissions and roles */
      permissions,
      roles,
    };
  }, [user]);
}
