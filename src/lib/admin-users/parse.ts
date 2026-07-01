import {
  displayUserRoleLabel,
  PROJECT_USER_ROLES,
} from "@/lib/admin-users/roles";
import type {
  AppUserRole,
  AdminUserRow,
  ChurchAuthUser,
  ChurchAuthUsersStats,
} from "@/lib/admin-users/types";

type RoleRow = {
  app_role_id?: number | string;
  app_role_name?: string;
  description?: string | null;
  is_primary?: boolean;
};

type UserRow = {
  auth_user_id?: string;
  email?: string;
  profile_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  app_role_id?: number | string | null;
  app_role_name?: string | null;
  membership_role?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function parseRoleId(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const id = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(id) ? id : null;
}

export function parseAppUserRole(row: unknown): AppUserRole | null {
  if (!row || typeof row !== "object") return null;
  const r = row as RoleRow;
  const appRoleId = parseRoleId(r.app_role_id);
  const appRoleName = str(r.app_role_name);
  if (appRoleId == null || !appRoleName) return null;
  return {
    appRoleId,
    appRoleName,
    description: str(r.description),
    isPrimary: r.is_primary === true,
  };
}

export function parseAppUserRoles(data: unknown): AppUserRole[] {
  if (!Array.isArray(data)) return [];
  return data
    .map(parseAppUserRole)
    .filter((r): r is AppUserRole => r != null);
}

export function parseChurchAuthUser(row: unknown): ChurchAuthUser | null {
  if (!row || typeof row !== "object") return null;
  const r = row as UserRow;
  const authUserId = str(r.auth_user_id);
  const profileId = str(r.profile_id);
  const email = str(r.email);
  if (!authUserId || !profileId || !email) return null;

  return {
    authUserId,
    email,
    profileId,
    firstName: str(r.first_name),
    lastName: str(r.last_name),
    appRoleId: parseRoleId(r.app_role_id),
    appRoleName: str(r.app_role_name),
    membershipRole: str(r.membership_role),
    isActive: r.is_active === true,
    isVerified: r.is_verified === true,
    lastLoginAt: str(r.last_login_at),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  };
}

export function parseChurchAuthUsersResponse(data: unknown): ChurchAuthUser[] {
  const row =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as { users?: unknown })
      : null;
  const users = row?.users ?? data;
  if (!Array.isArray(users)) return [];
  return users
    .map(parseChurchAuthUser)
    .filter((u): u is ChurchAuthUser => u != null);
}

export function churchAuthUserFullName(user: ChurchAuthUser): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.email.split("@")[0] ?? "Usuario";
}

export function churchAuthUserInitials(user: ChurchAuthUser): string {
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  if (initials) return initials;
  return user.email.slice(0, 2).toUpperCase();
}

export function formatLastLogin(iso: string | null): string {
  if (!iso) return "Nunca";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Nunca";

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const time = date.toLocaleTimeString("es-DO", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (date >= startOfToday) return `Hoy · ${time}`;
  if (date >= startOfYesterday) return `Ayer · ${time}`;

  const diffDays = Math.floor(
    (startOfToday.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString("es-DO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function toAdminUserRow(user: ChurchAuthUser): AdminUserRow {
  return {
    id: user.authUserId,
    authUserId: user.authUserId,
    profileId: user.profileId,
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    role: displayUserRoleLabel(user),
    lastLogin: formatLastLogin(user.lastLoginAt),
    active: user.isActive,
  };
}

export function isConnectedToday(lastLoginAt: string | null): boolean {
  if (!lastLoginAt) return false;
  const date = new Date(lastLoginAt);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function computeChurchAuthUsersStats(
  users: ChurchAuthUser[],
): ChurchAuthUsersStats {
  return {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
    connectedToday: users.filter((u) => isConnectedToday(u.lastLoginAt)).length,
  };
}

export function appRoleChipClass(roleName: string | null): string {
  if (!roleName) return "info";
  const lower = roleName.toLowerCase();
  if (lower.includes("administrator") || lower.includes("pastor")) return "violet";
  if (lower.includes("treasurer") || lower.includes("finance")) return "green";
  if (lower.includes("secretary")) return "lila";
  return "info";
}
