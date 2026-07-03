import type { PermissionKey } from "@/lib/auth/permission-keys";
import { isPermissionKey } from "@/lib/auth/permission-keys";

/** Claves legacy en BD antes de la migración granular. */
const LEGACY_FINANCE_READ = "finances:read";
const LEGACY_FINANCE_WRITE = "finances:write";
const LEGACY_FINANCE_AUTHORIZE = "finances:authorize";

const LEGACY_READ_GRANTS: PermissionKey[] = [
  "finances:funds:read",
  "finances:transactions:read",
  "finances:contributions:read",
  "finances:funds:export",
  "finances:transactions:export",
  "finances:contributions:export",
];

const LEGACY_WRITE_GRANTS: PermissionKey[] = [
  "finances:funds:write",
  "finances:transactions:write",
  "finances:contributions:write",
  "finances:funds:delete",
  "finances:transactions:delete",
  "finances:contributions:delete",
];

const LEGACY_SETTINGS_CATALOGS_GRANTS: PermissionKey[] = [
  "settings:expense_types:read",
  "settings:expense_types:write",
  "settings:expense_types:delete",
  "settings:income_types:read",
  "settings:income_types:write",
  "settings:income_types:delete",
];

/**
 * Normaliza permisos de sesión/roles: claves granulares + expansión de legacy finances:*.
 */
export function expandPermissionKeys(raw: unknown): PermissionKey[] {
  if (!Array.isArray(raw)) return [];

  const set = new Set<PermissionKey>();

  for (const item of raw) {
    if (typeof item !== "string") continue;

    if (isPermissionKey(item)) {
      set.add(item);
      continue;
    }

    if (item === LEGACY_FINANCE_READ) {
      for (const key of LEGACY_READ_GRANTS) set.add(key);
    } else if (item === LEGACY_FINANCE_WRITE) {
      for (const key of LEGACY_WRITE_GRANTS) set.add(key);
    } else if (item === LEGACY_FINANCE_AUTHORIZE) {
      set.add("finances:transactions:authorize");
    } else if (item === "settings:catalogs") {
      for (const key of LEGACY_SETTINGS_CATALOGS_GRANTS) set.add(key);
    }
  }

  return [...set].sort();
}
