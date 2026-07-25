/**
 * Permission checking utilities for AssocHub frontend.
 * Backend returns permissions like "members:read", "finances:write", etc.
 */

import { getUser } from "./api";

/** Check if current user has a specific permission */
export function hasPermission(permission: string): boolean {
  const user = getUser();
  if (!user) return false;
  return user.permissions?.includes(permission) ?? false;
}

/** Check if current user has ANY of the given permissions */
export function hasAnyPermission(...permissions: string[]): boolean {
  const user = getUser();
  if (!user) return false;
  return permissions.some(p => user.permissions?.includes(p) ?? false);
}

/** Check if current user has ALL of the given permissions */
export function hasAllPermissions(...permissions: string[]): boolean {
  const user = getUser();
  if (!user) return false;
  return permissions.every(p => user.permissions?.includes(p) ?? false);
}

/** Check if user is admin (has admin:all or tenant_admin/super_admin role) */
export function isAdmin(): boolean {
  const user = getUser();
  if (!user) return false;
  return (
    user.permissions?.includes("admin:all") ||
    user.roles?.includes("super_admin") ||
    user.roles?.includes("tenant_admin")
  ) ?? false;
}

/** Check if user is staff or above */
export function isStaff(): boolean {
  const user = getUser();
  if (!user) return false;
  return (
    user.permissions?.includes("admin:all") ||
    user.roles?.some(r => ["super_admin", "tenant_admin", "staff"].includes(r))
  ) ?? false;
}
