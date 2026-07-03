"use server";

import { parseAppSession } from "@/lib/auth/app-session";
import { syncAuthAppMetadata } from "@/lib/auth/sync-app-metadata";
import {
  sessionRequiresPasswordChange,
  UPDATE_PASSWORD_PATH,
} from "@/lib/auth/temp-password-flow";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Correo y contraseña son obligatorios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const params = new URLSearchParams();
    params.set("error", "credentials");
    params.set("email", email);
    if (next.startsWith("/")) params.set("next", next);
    redirect(`/login?${params.toString()}`);
  }

  const { data: sessionContext, error: contextError } = await supabase.rpc(
    "sp_get_session_context",
  );
  const session = parseAppSession(sessionContext);

  if (contextError || !session) {
    await supabase.auth.signOut();
    const params = new URLSearchParams();
    params.set("error", "no_church");
    params.set("email", email);
    if (next.startsWith("/")) params.set("next", next);
    redirect(`/login?${params.toString()}`);
  }

  await syncAuthAppMetadata(session, supabase);
  await supabase.auth.refreshSession();

  if (sessionRequiresPasswordChange(session)) {
    redirect(UPDATE_PASSWORD_PATH);
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
