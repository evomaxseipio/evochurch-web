import {
  parseAppPermissions,
  parseAssignableRoles,
  parseChurchRolesWithPermissions,
  parseCreateChurchRoleResult,
} from "@/lib/roles/parse";
import type {
  AppPermissionRow,
  AssignableRole,
  ChurchRolePermissions,
  CreateChurchRoleResult,
} from "@/lib/roles/types";
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

export async function createChurchRole(
  supabase: SupabaseClient,
  churchId: number,
  input: { name: string; description: string },
): Promise<CreateChurchRoleResult> {
  const { data, error } = await supabase.rpc("sp_create_church_role", {
    p_church_id: churchId,
    p_name: input.name,
    p_description: input.description || null,
  });
  if (error) throw error;

  const created = parseCreateChurchRoleResult(data);
  if (!created) {
    assertRpcSuccess(data, "No se pudo crear el rol.");
    throw new Error("No se pudo crear el rol.");
  }
  return created;
}

export async function updateChurchRole(
  supabase: SupabaseClient,
  churchId: number,
  appRoleId: number,
  input: { name: string; description: string },
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_update_church_role", {
    p_church_id: churchId,
    p_app_role_id: appRoleId,
    p_name: input.name,
    p_description: input.description || null,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudo actualizar el rol.");
}

export async function fetchAssignableRoles(
  supabase: SupabaseClient,
  churchId: number,
): Promise<AssignableRole[]> {
  const { data, error } = await supabase.rpc("sp_list_assignable_roles", {
    p_church_id: churchId,
  });
  if (error) throw error;
  return parseAssignableRoles(data);
}

export async function deactivateChurchRole(
  supabase: SupabaseClient,
  churchId: number,
  appRoleId: number,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_deactivate_church_role", {
    p_church_id: churchId,
    p_app_role_id: appRoleId,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudo inactivar el rol.");
}
