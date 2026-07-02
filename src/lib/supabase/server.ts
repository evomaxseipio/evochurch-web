import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabaseEnv, supabaseClientOptions } from "./config";
import { withRpcTiming } from "./with-rpc-timing";

export const createClient = cache(async () => {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return withRpcTiming(createServerClient(url, anonKey, {
    ...supabaseClientOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component; middleware refreshes the session.
        }
      },
    },
  }));
});
