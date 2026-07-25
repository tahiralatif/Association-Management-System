"use client";

import { hasPermission, hasAnyPermission } from "@/lib/permissions";

interface PermissionGateProps {
  /** Required permission(s) — user must have ALL of these */
  permission?: string;
  /** Required permissions — user must have ANY of these */
  anyPermission?: string[];
  /** What to render when permission check fails */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders children based on user permissions.
 *
 * Usage:
 * <PermissionGate permission="finances:write">
 *   <Button>Create Invoice</Button>
 * </PermissionGate>
 *
 * <PermissionGate anyPermission={["events:write", "events:delete"]} fallback={null}>
 *   <DropdownMenu>
 *     <DropdownMenuItem>Edit Event</DropdownMenuItem>
 *     <DropdownMenuItem>Delete Event</DropdownMenuItem>
 *   </DropdownMenu>
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  anyPermission,
  fallback = null,
  children,
}: PermissionGateProps) {
  let allowed = false;

  if (permission) {
    allowed = hasPermission(permission);
  } else if (anyPermission) {
    allowed = hasAnyPermission(...anyPermission);
  } else {
    allowed = true; // No restriction
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}
