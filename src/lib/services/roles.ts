import {
  parseAppPermissions,
  parseChurchRolesWithPermissions,
} from "@/lib/roles/parse";
import type { AppPermissionRow, ChurchRolePermissions } from "@/lib/roles/types";
import { isPermissionKey, type PermissionKey } from "@/lib/auth/permission-keys";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchAppPermissions(
  supabase: SupabaseClient,
): Promise<AppPermissionRow[]> {
  const { data, error } = await supabase
    .from("app_permissions")
    .select("permission_key, module, action, description")
    .order("module")
    .order("permission_key");

  if (error) throw error;
  return parseAppPermissions(data);
}

export async function fetchChurchRolesWithPermissions(
  supabase: SupabaseClient,
  churchId: number,
  userCounts: Record<number, number> = {},
): Promise<ChurchRolePermissions[]> {
  const { data, error } = await supabase.rpc(
    "sp_list_church_roles_with_permissions",
    { p_church_id: churchId },
  );
  if (error) throw error;
  return parseChurchRolesWithPermissions(data, userCounts);
}

export async function setChurchRolePermissions(
  supabase: SupabaseClient,
  churchId: number,
  appRoleId: number,
  permissionKeys: PermissionKey[],
): Promise<void> {
  const keys = permissionKeys.filter(isPermissionKey);
  const { data, error } = await supabase.rpc("sp_set_church_role_permissions", {
    p_church_id: churchId,
    p_app_role_id: appRoleId,
    p_permission_keys: keys,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudieron guardar los permisos.");
}
