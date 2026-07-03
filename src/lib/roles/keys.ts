import type { RoleKind } from "@/lib/roles/role-config";

/** Identificador estable del rol Administrador (sesión / guards puntuales). */
export const ADMIN_ROLE_KEY = "admin";

/** ID estable del rol Administrador en BD (secuencia; id 1 en instalaciones base). */
export const ADMIN_APP_ROLE_ID = 1;

export function isSystemLockedRole(input: {
  roleKind?: RoleKind | null;
}): boolean {
  return input.roleKind === "system_locked";
}

export function isAdminRole(input: {
  roleKey?: string | null;
}): boolean {
  return input.roleKey === ADMIN_ROLE_KEY;
}

export function canDeactivateRole(input: {
  roleKind?: RoleKind | null;
}): boolean {
  return input.roleKind === "custom";
}

/** Slug para role_key de roles personalizados (referencia; generación en BD). */
export function slugifyRoleKey(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "rol";
}
