export type MemberRoleCatalog = {
  id: string;
  roleName: string;
  roleCode: string;
};

export const VISITA_ROLE_CODE = "visita";
export const PASTOR_ROLE_CODE = "pastor";
export const CATECHUMEN_ROLE_CODE = "catecumenos";

export function findMemberRoleByCode(
  roles: MemberRoleCatalog[],
  code: string,
): MemberRoleCatalog | undefined {
  const normalized = code.trim().toLowerCase();
  return roles.find((r) => r.roleCode === normalized);
}

export function findMemberRoleById(
  roles: MemberRoleCatalog[],
  id: string,
): MemberRoleCatalog | undefined {
  const normalized = id.trim();
  if (!normalized) return undefined;
  return roles.find((r) => r.id === normalized);
}

export function memberRoleLabel(
  roles: MemberRoleCatalog[],
  roleId: string | null | undefined,
  fallback = "Visita",
): string {
  if (!roleId) return fallback;
  return findMemberRoleById(roles, roleId)?.roleName ?? fallback;
}
