import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { cache } from "react";

/**
 * Usuario de sesión para Server Components.
 * Lee el JWT de la cookie (rápido) — el proxy ya refrescó la sesión con getUser().
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
});

/** getUser() verificado — una sola llamada por request RSC (React.cache). */
export const getVerifiedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
