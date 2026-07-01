import {
  parseAppUserRoles,
  parseChurchAuthUsersResponse,
} from "@/lib/admin-users/parse";
import type { AdminUserInput, AppUserRole, ChurchAuthUser } from "@/lib/admin-users/types";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchAppUserRoles(
  supabase: SupabaseClient,
): Promise<AppUserRole[]> {
  const { data, error } = await supabase.rpc("sp_list_app_user_roles");
  if (error) throw error;
  return parseAppUserRoles(data);
}

export async function fetchChurchAuthUsers(
  supabase: SupabaseClient,
  churchId: number,
): Promise<ChurchAuthUser[]> {
  const { data, error } = await supabase.rpc("sp_list_church_auth_users", {
    p_church_id: churchId,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudieron cargar los usuarios.");
  return parseChurchAuthUsersResponse(data);
}

export async function registerChurchAuthUser(
  supabase: SupabaseClient,
  churchId: number,
  input: {
    authUserId: string;
    profileId: string;
    email: string;
    appRoleId: number | null;
    isActive: boolean;
  },
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_register_church_auth_user", {
    p_church_id: churchId,
    p_auth_user_id: input.authUserId,
    p_profile_id: input.profileId,
    p_email: input.email,
    p_app_role_id: input.appRoleId,
    p_is_active: input.isActive,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudo registrar el usuario.");
}

export async function updateChurchAuthUser(
  supabase: SupabaseClient,
  churchId: number,
  input: AdminUserInput & { clearAppRole?: boolean },
): Promise<void> {
  if (!input.authUserId) {
    throw new Error("Usuario no válido.");
  }

  const { data, error } = await supabase.rpc("sp_update_church_auth_user", {
    p_church_id: churchId,
    p_auth_user_id: input.authUserId,
    p_profile_id: input.profileId || null,
    p_email: input.email || null,
    p_app_role_id: input.appRoleId,
    p_is_active: input.isActive,
    p_clear_app_role: input.clearAppRole === true,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudo actualizar el usuario.");
}
