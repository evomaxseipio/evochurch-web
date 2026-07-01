import type { SupabaseClient } from "@supabase/supabase-js";

/** General Administrator o Pastor (membresía). */
export async function canAuthorizeFinances(
  supabase: SupabaseClient,
  profileId: string,
  authUserId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("fn_can_authorize_finances", {
    p_profile_id: profileId,
    p_auth_user_id: authUserId,
  });

  if (error) {
    console.error("fn_can_authorize_finances:", error.message);
    return false;
  }

  return data === true;
}
