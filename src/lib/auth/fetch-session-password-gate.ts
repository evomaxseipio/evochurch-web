import { parseAppSession } from "@/lib/auth/app-session";
import { sessionRequiresPasswordChange } from "@/lib/auth/temp-password-flow";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchSessionRequiresPasswordChange(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("sp_get_session_context");
  if (error) return false;
  return sessionRequiresPasswordChange(parseAppSession(data));
}
