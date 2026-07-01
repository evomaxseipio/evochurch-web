import type { AppSession } from "@/lib/auth/app-session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthAppMetadata = {
  church_id: number;
  profile_id: string;
  app_role_id?: number | null;
  church_name?: string | null;
  is_temp_password?: boolean;
};

export function sessionToAppMetadata(session: AppSession): AuthAppMetadata {
  return {
    church_id: session.churchId,
    profile_id: session.profileId,
    app_role_id: session.appRoleId,
    church_name: session.churchName,
    is_temp_password: session.isTempPassword,
  };
}

/**
 * Sincroniza app_metadata en Supabase Auth (caché JWT).
 * 1) RPC sp_sync_my_app_metadata (sin service role)
 * 2) Admin API si SUPABASE_SERVICE_ROLE_KEY está configurada
 */
export async function syncAuthAppMetadata(
  session: AppSession,
  supabase?: SupabaseClient,
): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.rpc("sp_sync_my_app_metadata");
    if (!error) return true;
    console.warn("sp_sync_my_app_metadata:", error.message);
  }

  const admin = createAdminClient();
  if (!admin) return false;

  const { error } = await admin.auth.admin.updateUserById(session.authUserId, {
    app_metadata: sessionToAppMetadata(session),
  });

  if (error) {
    console.error("syncAuthAppMetadata:", error.message);
    return false;
  }

  return true;
}
