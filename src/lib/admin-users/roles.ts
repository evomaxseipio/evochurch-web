import { ADMIN_ROLE_KEY } from "@/lib/roles/keys";

export function displayUserRoleLabel(input: {
  appRoleId: number | null;
  appRoleName: string | null;
  membershipRole: string | null;
  roleKey?: string | null;
}): string {
  if (input.appRoleName?.trim()) return input.appRoleName.trim();

  const membership = input.membershipRole?.trim();
  if (membership) return membership;

  return "—";
}

export function isPastorRole(input: {
  roleKey?: string | null;
  roleName?: string | null;
}): boolean {
  if (input.roleKey === "pastor") return true;
  return (input.roleName ?? "").trim().toLowerCase() === "pastor";
}

export function isAdminAppRole(input: {
  appRoleId?: number | null;
  roleKey?: string | null;
}): boolean {
  return input.roleKey === ADMIN_ROLE_KEY || input.appRoleId === 1;
}

/** Clases de chip por nombre de rol (heurística visual). */
export function appRoleChipClass(roleName: string | null): string {
  if (!roleName) return "info";
  const lower = roleName.toLowerCase();
  if (lower.includes("administrador") || lower.includes("pastor")) return "violet";
  if (lower.includes("tesorero") || lower.includes("finanz")) return "green";
  if (lower.includes("secretario")) return "lila";
  return "info";
}
