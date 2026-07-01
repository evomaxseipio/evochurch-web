import { parseAppSession } from "@/lib/auth/app-session";
import { sessionRequiresPasswordChange } from "@/lib/auth/temp-password-flow";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/** null = flag ausente en JWT; requiere RPC para confirmar. */
export function jwtIndicatesTempPassword(user: User): boolean | null {
  const flag = user.app_metadata?.is_temp_password;
  if (flag === true) return true;
  if (flag === false) return false;
  return null;
}

async function fetchSessionRequiresPasswordChange(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("sp_get_session_context");
  if (error) {
    console.error("sp_get_session_context (password gate):", error.message);
    return true;
  }
  return sessionRequiresPasswordChange(parseAppSession(data));
}

/**
 * Password gate: JWT fast-path cuando `is_temp_password` está sincronizado;
 * RPC solo si el flag no está en app_metadata (sesiones legacy).
 */
export async function resolveSessionRequiresPasswordChange(
  supabase: SupabaseClient,
  user: User,
): Promise<boolean> {
  const fromJwt = jwtIndicatesTempPassword(user);
  if (fromJwt === true) return true;
  if (fromJwt === false) return false;
  return fetchSessionRequiresPasswordChange(supabase);
}
