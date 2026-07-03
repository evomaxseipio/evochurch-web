import type { PermissionKey } from "@/lib/auth/permission-keys";

export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  "/dashboard": "dashboard:read",
  "/members": "members:read",
  "/ministerios": "ministerios:read",
  "/finances/funds": "finances:funds:read",
  "/finances/transactions": "finances:transactions:read",
  "/finances/contributions": "finances:contributions:read",
  "/finances": "finances:funds:read",
  "/eventos": "eventos:read",
  "/comunicacion": "comunicacion:read",
  "/settings/users": "admin_users:manage",
  "/settings/expenses": "settings:catalogs",
  "/settings/income-types": "settings:catalogs",
  "/settings/roles": "roles:manage",
  "/settings": "settings:read",
};

export function permissionForPath(pathname: string): PermissionKey | null {
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
