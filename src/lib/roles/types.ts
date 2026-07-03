import type { PermissionKey } from "@/lib/auth/permission-keys";

export type AppPermissionRow = {
  permissionKey: PermissionKey;
  module: string;
  action: string;
  description: string;
};

export type ChurchRolePermissions = {
  appRoleId: number;
  appRoleName: string;
  description: string | null;
  permissions: PermissionKey[];
  userCount: number;
};

export const ADMIN_APP_ROLE_ID = 1;
