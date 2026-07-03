import type { PermissionKey } from "@/lib/auth/permission-keys";
import type { RoleConfig, RoleKind } from "@/lib/roles/role-config";

export type AppPermissionRow = {
  permissionKey: PermissionKey;
  module: string;
  action: string;
  description: string;
};

export type ChurchRolePermissions = {
  appRoleId: number;
  roleKey: string | null;
  roleKind: RoleKind | null;
  roleConfig: RoleConfig;
  appRoleName: string;
  description: string | null;
  permissions: PermissionKey[];
  userCount: number;
  isCustom: boolean;
};

export type AssignableRole = {
  appRoleId: number;
  roleKey: string | null;
  roleKind: RoleKind | null;
  roleConfig: RoleConfig;
  appRoleName: string;
  description: string | null;
};

export type CreateChurchRoleResult = {
  appRoleId: number;
  roleKey: string | null;
  roleKind: RoleKind | null;
  roleConfig: RoleConfig;
  appRoleName: string;
  description: string | null;
};

export {
  ADMIN_ROLE_KEY,
  canDeactivateRole,
  isAdminRole,
  isSystemLockedRole,
} from "@/lib/roles/keys";

export type { RoleConfig, RoleKind } from "@/lib/roles/role-config";
