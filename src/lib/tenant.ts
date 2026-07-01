import type { User } from "@supabase/supabase-js";

/**
 * @deprecated Solo caché JWT para UI legacy. Autorización multitenant: `getAppSession()` /
 * `sp_get_session_context()` — no usar para permisos ni mutaciones.
 */
export function getChurchId(user: User | null): number | null {
  if (!user) return null;

  const raw =
    user.app_metadata?.church_id ??
    user.user_metadata?.church_id ??
    user.user_metadata?.churchId;

  if (raw == null || raw === "") return null;
  const id = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(id) ? id : null;
}

export function requireChurchId(user: User | null): number {
  const churchId = getChurchId(user);
  if (churchId == null) {
    throw new Error("church_id no está en la sesión del usuario");
  }
  return churchId;
}

/** Profile UUID for RPCs (`p_created_by_profile_id`, etc.) — prefer app_metadata. */
export function getProfileId(user: User | null): string | null {
  if (!user) return null;
  const raw =
    user.app_metadata?.profile_id ??
    user.user_metadata?.profile_id ??
    user.user_metadata?.profileId;
  return raw != null && String(raw).length > 0 ? String(raw) : null;
}

export function requireProfileId(user: User | null): string {
  const profileId = getProfileId(user);
  if (!profileId) {
    throw new Error("profile_id no está en la sesión del usuario");
  }
  return profileId;
}

export function getChurchDisplayName(user: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const name =
    meta.church_name ??
    meta.churchName ??
    meta.church_display_name ??
    user.app_metadata?.church_name;
  return typeof name === "string" && name.length > 0 ? name : null;
}
