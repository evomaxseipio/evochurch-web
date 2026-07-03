import { isPermissionKey, type PermissionKey } from "@/lib/auth/permission-keys";
import type { AppPermissionRow, ChurchRolePermissions } from "@/lib/roles/types";

type RpcRoleRow = {
  app_role_id?: number | string;
  app_role_name?: string;
  description?: string | null;
  permissions?: unknown;
};

type DbPermissionRow = {
  permission_key?: string;
  module?: string;
  action?: string;
  description?: string;
};

function parseRoleId(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const id = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(id) ? id : null;
}

function parsePermissionList(raw: unknown): PermissionKey[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (k): k is PermissionKey => typeof k === "string" && isPermissionKey(k),
  );
}

export function parseChurchRolePermissions(
  row: unknown,
  userCount = 0,
): ChurchRolePermissions | null {
  if (!row || typeof row !== "object") return null;
  const r = row as RpcRoleRow;
  const appRoleId = parseRoleId(r.app_role_id);
  const appRoleName =
    typeof r.app_role_name === "string" ? r.app_role_name.trim() : "";
  if (appRoleId == null || !appRoleName) return null;

  return {
    appRoleId,
    appRoleName,
    description:
      typeof r.description === "string" ? r.description.trim() || null : null,
    permissions: parsePermissionList(r.permissions),
    userCount,
  };
}

export function parseChurchRolesWithPermissions(
  data: unknown,
  userCounts: Record<number, number> = {},
): ChurchRolePermissions[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) =>
      parseChurchRolePermissions(
        row,
        userCounts[parseRoleId((row as RpcRoleRow).app_role_id) ?? -1] ?? 0,
      ),
    )
    .filter((r): r is ChurchRolePermissions => r != null);
}

export function parseAppPermissionRow(row: unknown): AppPermissionRow | null {
  if (!row || typeof row !== "object") return null;
  const r = row as DbPermissionRow;
  const permissionKey = r.permission_key;
  if (typeof permissionKey !== "string" || !isPermissionKey(permissionKey)) {
    return null;
  }
  return {
    permissionKey,
    module: typeof r.module === "string" ? r.module : "other",
    action: typeof r.action === "string" ? r.action : "read",
    description:
      typeof r.description === "string" ? r.description : permissionKey,
  };
}

export function parseAppPermissions(data: unknown): AppPermissionRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .map(parseAppPermissionRow)
    .filter((r): r is AppPermissionRow => r != null);
}
