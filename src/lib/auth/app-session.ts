import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/session";
import { sessionRequiresPasswordChange } from "@/lib/auth/temp-password-flow";
import { cache } from "react";

export type AppSession = {
  authUserId: string;
  profileId: string;
  email: string;
  churchId: number;
  fullName: string | null;
  churchName: string | null;
  appRoleId: number | null;
  appRoleName: string | null;
  membershipRole: string | null;
  canAuthorizeFinances: boolean;
  isActive: boolean;
  isVerified: boolean;
  isTempPassword: boolean;
};

type SessionContextRow = {
  auth_user_id?: string;
  profile_id?: string;
  email?: string;
  church_id?: number | string;
  full_name?: string | null;
  church_name?: string | null;
  app_role_id?: number | null;
  app_role_name?: string | null;
  membership_role?: string | null;
  can_authorize_finances?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  is_temp_password?: boolean;
};

function parseChurchId(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const id = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(id) ? id : null;
}

export function parseAppSession(data: unknown): AppSession | null {
  if (!data || typeof data !== "object") return null;

  const row = data as SessionContextRow;
  const churchId = parseChurchId(row.church_id);
  const profileId =
    row.profile_id != null && String(row.profile_id).length > 0
      ? String(row.profile_id)
      : null;
  const authUserId =
    row.auth_user_id != null && String(row.auth_user_id).length > 0
      ? String(row.auth_user_id)
      : null;

  if (churchId == null || !profileId || !authUserId) return null;

  return {
    authUserId,
    profileId,
    email: String(row.email ?? ""),
    churchId,
    fullName:
      typeof row.full_name === "string" && row.full_name.length > 0
        ? row.full_name
        : null,
    churchName:
      typeof row.church_name === "string" && row.church_name.length > 0
        ? row.church_name
        : null,
    appRoleId:
      row.app_role_id == null
        ? null
        : Number.parseInt(String(row.app_role_id), 10) || null,
    appRoleName:
      typeof row.app_role_name === "string" && row.app_role_name.length > 0
        ? row.app_role_name
        : null,
    membershipRole:
      typeof row.membership_role === "string" &&
      row.membership_role.length > 0
        ? row.membership_role
        : null,
    canAuthorizeFinances: row.can_authorize_finances === true,
    isActive: row.is_active === true,
    isVerified: row.is_verified === true,
    isTempPassword: row.is_temp_password === true,
  };
}

export function getSessionDisplayRole(session: AppSession): string {
  return session.appRoleName ?? session.membershipRole ?? "Usuario";
}

/**
 * Sesión de negocio multitenant — resuelta en BD vía auth.uid(), no desde JWT del cliente.
 */
export const getAppSession = cache(async (): Promise<AppSession | null> => {
  const user = await getVerifiedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sp_get_session_context");

  if (error) {
    console.error("sp_get_session_context:", error.message);
    return null;
  }

  return parseAppSession(data);
});

export async function requireAppSession(): Promise<AppSession> {
  const session = await getAppSession();
  if (!session) {
    throw new Error(
      "Tu cuenta no está vinculada a una iglesia. Contacta al administrador.",
    );
  }
  return session;
}

/** Supabase + sesión de negocio para server actions (multitenant). */
export async function getActionSession() {
  const session = await requireAppSession();
  if (sessionRequiresPasswordChange(session)) {
    throw new Error("Debes cambiar tu contraseña temporal antes de continuar.");
  }
  const supabase = await createClient();
  return { supabase, session };
}
