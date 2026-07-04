"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/session";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/i18n/config";

export type SetLocaleResult =
  | { ok: true }
  | { ok: false; errorKey: string };

export async function setLocaleAction(locale: string): Promise<SetLocaleResult> {
  if (!isLocale(locale)) {
    return { ok: false, errorKey: "errors.invalidLocale" };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const user = await getVerifiedUser();
  if (user) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("sp_update_preferred_locale", {
      p_locale: locale,
    });
    if (error) {
      console.error("sp_update_preferred_locale:", error.message);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function getCurrentLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;
  if (stored && isLocale(stored)) return stored;
  return defaultLocale;
}
