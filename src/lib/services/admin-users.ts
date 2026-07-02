import {
  parseAppUserRoles,
  parseChurchAuthUser,
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

export async function findProfileByEmail(
  supabase: SupabaseClient,
  churchId: number,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("sp_find_profile_by_email", {
    p_church_id: churchId,
    p_email: email,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudo buscar el miembro.");
  const root =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  const profile =
    root?.profile && typeof root.profile === "object"
      ? (root.profile as Record<string, unknown>)
      : null;
  const profileId = profile?.profile_id;
  return profileId != null ? String(profileId) : null;
}

export async function fetchChurchAuthUserByProfile(
  supabase: SupabaseClient,
  churchId: number,
  profileId: string,
): Promise<ChurchAuthUser | null> {
  const { data, error } = await supabase.rpc(
    "sp_get_church_auth_user_by_profile",
    {
      p_church_id: churchId,
      p_profile_id: profileId,
    },
  );
  if (error) throw error;
  assertRpcSuccess(data, "No se pudo cargar el usuario.");
  const root =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  if (!root?.user) return null;
  return parseChurchAuthUser(root.user);
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

export async function setAuthUserTempPassword(
  supabase: SupabaseClient,
  churchId: number,
  authUserId: string,
  tempPassword: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_set_auth_user_temp_password", {
    p_church_id: churchId,
    p_auth_user_id: authUserId,
    p_temp_password: tempPassword,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudo registrar la contraseña temporal.");
}

export async function getAuthUserTempPassword(
  supabase: SupabaseClient,
  churchId: number,
  authUserId: string,
): Promise<{ isTempPassword: boolean; tempPassword: string | null }> {
  const { data, error } = await supabase.rpc("sp_get_auth_user_temp_password", {
    p_church_id: churchId,
    p_auth_user_id: authUserId,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudo leer la contraseña temporal.");
  const row =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  return {
    isTempPassword: row?.is_temp_password === true,
    tempPassword:
      typeof row?.temp_password === "string" ? row.temp_password : null,
  };
}

export async function clearAuthUserTempPassword(
  supabase: SupabaseClient,
  churchId: number,
  authUserId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_clear_auth_user_temp_password", {
    p_church_id: churchId,
    p_auth_user_id: authUserId,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudo limpiar la contraseña temporal.");
}

export async function resetChurchAuthUserPassword(
  supabase: SupabaseClient,
  churchId: number,
  authUserId: string,
  newPassword: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_reset_church_auth_user_password", {
    p_church_id: churchId,
    p_auth_user_id: authUserId,
    p_new_password: newPassword,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudo restablecer la contraseña de acceso.");
}
