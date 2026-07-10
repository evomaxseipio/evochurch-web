import type { PermissionKey } from "@/lib/auth/permission-keys";
import { REPORT_READ_PERMISSIONS } from "@/lib/reports/permissions";

export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  "/dashboard": "dashboard:read",
  "/members": "members:read",
  "/ministerios": "ministerios:read",
  "/finances/funds": "finances:funds:read",
  "/finances/transactions": "finances:transactions:read",
  "/finances/contributions": "finances:contributions:read",
  "/finances/tithe-close": "finances:tithe_close:read",
  "/finances": "finances:funds:read",
  "/eventos": "eventos:read",
  "/comunicacion": "comunicacion:read",
  "/settings/users": "admin_users:manage",
  "/settings/expenses": "settings:expense_types:read",
  "/settings/income-types": "settings:income_types:read",
  "/settings/roles": "roles:manage",
  "/settings/church": "settings:church:read",
  "/settings/discount-templates": "settings:church:read",
  "/network": "network:churches:read",
  "/settings": "settings:read",
};

export { REPORT_READ_PERMISSIONS };

export function requiresReportsHubAccess(pathname: string): boolean {
  return pathname === "/reports" || pathname.startsWith("/reports/");
}

export function permissionForPath(pathname: string): PermissionKey | null {
  if (requiresReportsHubAccess(pathname)) {
    return null;
  }
  const entries = Object.entries(ROUTE_PERMISSIONS).sort(
    ([a], [b]) => b.length - a.length,
  );
  for (const [prefix, perm] of entries) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return perm;
    }
  }
  return null;
}
