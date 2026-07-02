import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, supabaseClientOptions } from "./config";
import { withRpcTiming } from "./with-rpc-timing";

/** Cliente con service role — solo servidor, nunca importar en componentes cliente. */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;

  const { url } = getSupabaseEnv();
  return withRpcTiming(
    createSupabaseClient(url, serviceRoleKey, {
      ...supabaseClientOptions,
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
  );
}
