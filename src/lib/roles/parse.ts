import { expandPermissionKeys } from "@/lib/auth/finance-permission-bridge";
import { isPermissionKey, type PermissionKey } from "@/lib/auth/permission-keys";
import {
  parseRoleConfig,
  parseRoleKind,
} from "@/lib/roles/role-config";
import type {
  AppPermissionRow,
  AssignableRole,
  ChurchRolePermissions,
  CreateChurchRoleResult,
} from "@/lib/roles/types";

type RpcRoleRow = {
  app_role_id?: number | string;
  role_key?: string | null;
  role_kind?: string | null;
  role_config?: unknown;
  app_role_name?: string;
  description?: string | null;
  is_custom?: boolean;
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
  return expandPermissionKeys(raw);
}

function parseRoleRowBase(row: RpcRoleRow) {
  const appRoleId = parseRoleId(row.app_role_id);
  const appRoleName =
    typeof row.app_role_name === "string" ? row.app_role_name.trim() : "";
  if (appRoleId == null || !appRoleName) return null;

  const roleKind = parseRoleKind(row.role_kind);
  const roleConfig = parseRoleConfig(row.role_config);

  return {
    appRoleId,
    roleKey: typeof row.role_key === "string" ? row.role_key.trim() || null : null,
    roleKind,
    roleConfig,
    appRoleName,
    description:
      typeof row.description === "string" ? row.description.trim() || null : null,
    isCustom: row.is_custom === true || roleKind === "custom",
  };
}

export function parseChurchRolePermissions(
  row: unknown,
  userCount = 0,
): ChurchRolePermissions | null {
  if (!row || typeof row !== "object") return null;
  const base = parseRoleRowBase(row as RpcRoleRow);
  if (!base) return null;
  const r = row as RpcRoleRow;

  return {
    ...base,
    permissions: parsePermissionList(r.permissions),
    userCount,
  };
}

export function parseAssignableRole(row: unknown): AssignableRole | null {
  if (!row || typeof row !== "object") return null;
  const base = parseRoleRowBase(row as RpcRoleRow);
  if (!base) return null;

  return {
    appRoleId: base.appRoleId,
    roleKey: base.roleKey,
    roleKind: base.roleKind,
    roleConfig: base.roleConfig,
    appRoleName: base.appRoleName,
    description: base.description,
  };
}

export function parseAssignableRoles(data: unknown): AssignableRole[] {
  if (!Array.isArray(data)) return [];
  return data
    .map(parseAssignableRole)
    .filter((r): r is AssignableRole => r != null);
}

export function parseCreateChurchRoleResult(
  data: unknown,
): CreateChurchRoleResult | null {
  const row = asRecord(data);
  if (!row || row.success !== true) return null;

  const parsed = parseRoleRowBase({
    app_role_id: row.app_role_id as RpcRoleRow["app_role_id"],
    role_key: row.role_key as RpcRoleRow["role_key"],
    role_kind: row.role_kind as RpcRoleRow["role_kind"],
    role_config: row.role_config,
    app_role_name: row.app_role_name as RpcRoleRow["app_role_name"],
    description: row.description as RpcRoleRow["description"],
  });
  if (!parsed) return null;

  return parsed;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
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
