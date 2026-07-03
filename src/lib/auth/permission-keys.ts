/** Atomic permission keys — keep in sync with app_permissions seed. */
export const PERMISSION_KEYS = [
  "profile:read",
  "settings:read",
  "settings:catalogs",
  "dashboard:read",
  "members:read",
  "members:write",
  "members:delete",
  "ministerios:read",
  "ministerios:write",
  "ministerios:write_own",
  "eventos:read",
  "eventos:write",
  "eventos:delete",
  "comunicacion:read",
  "comunicacion:write",
  "comunicacion:delete",
  "finances:funds:read",
  "finances:funds:write",
  "finances:funds:delete",
  "finances:funds:export",
  "finances:transactions:read",
  "finances:transactions:write",
  "finances:transactions:authorize",
  "finances:transactions:delete",
  "finances:transactions:export",
  "finances:contributions:read",
  "finances:contributions:write",
  "finances:contributions:delete",
  "finances:contributions:export",
  "admin_users:manage",
  "roles:manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const FINANCE_READ_PERMISSIONS = [
  "finances:funds:read",
  "finances:transactions:read",
  "finances:contributions:read",
] as const satisfies readonly PermissionKey[];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

export { expandPermissionKeys as parsePermissionKeys } from "@/lib/auth/finance-permission-bridge";
