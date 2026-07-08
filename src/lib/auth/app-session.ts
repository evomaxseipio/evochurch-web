import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/session";
import { sessionRequiresPasswordChange } from "@/lib/auth/temp-password-flow";
import { parsePermissionKeys, type PermissionKey } from "@/lib/auth/permission-keys";

import { cache } from "react";

export type { PermissionKey };

export type ChurchBranding = {
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

export type ChurchKind = "standalone" | "headquarters" | "campus";

export type ChurchNetworkContext = {
  churchKind: ChurchKind;
  parentChurchId: number | null;
  campusCount: number;
};

export type AppSession = {
  authUserId: string;
  profileId: string;
  email: string;
  churchId: number;
  fullName: string | null;
  churchName: string | null;
  churchKind: ChurchKind;
  parentChurchId: number | null;
  churchNetwork: ChurchNetworkContext;
  churchBranding: ChurchBranding | null;
  appRoleId: number | null;
  appRoleName: string | null;
  membershipRole: string | null;
  permissions: PermissionKey[];
  canAuthorizeFinances: boolean;
  isActive: boolean;
  isVerified: boolean;
  isTempPassword: boolean;
  preferredLocale: string;
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
  preferred_locale?: string;
  permissions?: unknown;
  church_branding?: {
    short_name?: string | null;
    logo_url?: string | null;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
  } | null;
  church_kind?: string;
  parent_church_id?: number | string | null;
  church_network?: {
    church_kind?: string;
    parent_church_id?: number | string | null;
    campus_count?: number;
  } | null;
};

function parseChurchKind(raw: unknown): ChurchKind {
  if (raw === "headquarters" || raw === "campus" || raw === "standalone") {
    return raw;
  }
  return "standalone";
}

function parseChurchNetwork(
  row: SessionContextRow,
): ChurchNetworkContext {
  const network = row.church_network;
  const kind = parseChurchKind(network?.church_kind ?? row.church_kind);
  const parentRaw = network?.parent_church_id ?? row.parent_church_id;
  const parentId =
    parentRaw == null || parentRaw === ""
      ? null
      : Number.parseInt(String(parentRaw), 10) || null;

  return {
    churchKind: kind,
    parentChurchId: parentId,
    campusCount:
      network?.campus_count == null
        ? 0
        : Number.parseInt(String(network.campus_count), 10) || 0,
  };
}

function parseChurchBranding(raw: SessionContextRow["church_branding"]): ChurchBranding | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    shortName:
      typeof raw.short_name === "string" && raw.short_name.length > 0
        ? raw.short_name
        : null,
    logoUrl:
      typeof raw.logo_url === "string" && raw.logo_url.length > 0
        ? raw.logo_url
        : null,
    primaryColor:
      typeof raw.primary_color === "string" && raw.primary_color.length > 0
        ? raw.primary_color
        : "#5B21B6",
    secondaryColor:
      typeof raw.secondary_color === "string" && raw.secondary_color.length > 0
        ? raw.secondary_color
        : "#4C1D95",
    accentColor:
      typeof raw.accent_color === "string" && raw.accent_color.length > 0
        ? raw.accent_color
        : "#1E0A4C",
  };
}

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

  const churchNetwork = parseChurchNetwork(row);

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
    churchKind: churchNetwork.churchKind,
    parentChurchId: churchNetwork.parentChurchId,
    churchNetwork,
    churchBranding: parseChurchBranding(row.church_branding),
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
    permissions: parsePermissionKeys(row.permissions),
    canAuthorizeFinances:
      row.can_authorize_finances === true ||
      parsePermissionKeys(row.permissions).includes(
        "finances:transactions:authorize",
      ),
    isActive: row.is_active === true,
    isVerified: row.is_verified === true,
    isTempPassword: row.is_temp_password === true,
    preferredLocale:
      typeof row.preferred_locale === "string" &&
      row.preferred_locale.length > 0
        ? row.preferred_locale
        : "es",
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
