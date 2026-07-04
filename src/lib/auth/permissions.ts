import type { AppSession } from "@/lib/auth/app-session";
import type { PermissionKey } from "@/lib/auth/permission-keys";

export function hasPermission(session: AppSession, key: PermissionKey): boolean {
  return session.permissions.includes(key);
}

export function hasAnyPermission(
  session: AppSession,
  keys: PermissionKey[],
): boolean {
  return keys.some((k) => hasPermission(session, k));
}

export function requirePermission(session: AppSession, key: PermissionKey): void {
  if (!hasPermission(session, key)) {
    throw new Error(`Acceso denegado: se requiere permiso ${key}.`);
  }
}

/** Usuario sin rol operativo — solo perfil y settings. */
export function isProfileOnlySession(session: AppSession): boolean {
  return (
    !hasPermission(session, "dashboard:read") &&
    hasPermission(session, "profile:read")
  );
}

export function canAuthorizeFinances(session: AppSession): boolean {
  return hasPermission(session, "finances:transactions:authorize");
}

export function canManageAdminUsers(session: AppSession): boolean {
  return hasPermission(session, "admin_users:manage");
}

export function canReadMembers(session: AppSession): boolean {
  return canReadMembersWith(session.permissions);
}

export function canReadMembersWith(
  permissions: readonly PermissionKey[],
): boolean {
  return permissions.includes("members:read");
}

export function canWriteFundsWith(
  permissions: readonly PermissionKey[],
): boolean {
  return permissions.includes("finances:funds:write");
}

export function canWriteContributionsWith(
  permissions: readonly PermissionKey[],
): boolean {
  return permissions.includes("finances:contributions:write");
}

export function canWriteMembers(session: AppSession): boolean {
  return hasPermission(session, "members:write");
}

export function canDeleteMembers(session: AppSession): boolean {
  return hasPermission(session, "members:delete");
}

export function canWriteContributions(session: AppSession): boolean {
  return hasPermission(session, "finances:contributions:write");
}

export function canCreateMinistry(session: AppSession): boolean {
  return canCreateMinistryWith(session.permissions);
}

export function canCreateMinistryWith(
  permissions: readonly PermissionKey[],
): boolean {
  return permissions.includes("ministerios:write");
}

/** ABAC: write global o write_own cuando el perfil es líder del ministerio. */
export function canEditMinistryRecord(
  session: AppSession,
  leaderProfileIds: string[],
): boolean {
  return canEditMinistryWith(
    session.permissions,
    session.profileId,
    leaderProfileIds,
  );
}

export function canEditMinistryWith(
  permissions: readonly PermissionKey[],
  profileId: string,
  leaderProfileIds: string[],
): boolean {
  if (permissions.includes("ministerios:write")) return true;
  return (
    permissions.includes("ministerios:write_own") &&
    leaderProfileIds.includes(profileId)
  );
}
