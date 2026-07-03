"use client";

import type { PermissionKey } from "@/lib/auth/permission-keys";

export function Can({
  permission,
  permissions,
  children,
  fallback = null,
}: {
  permission: PermissionKey | PermissionKey[];
  permissions: PermissionKey[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const keys = Array.isArray(permission) ? permission : [permission];
  const allowed = keys.some((k) => permissions.includes(k));
  return allowed ? <>{children}</> : <>{fallback}</>;
}
