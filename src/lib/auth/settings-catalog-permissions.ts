import type { PermissionKey } from "@/lib/auth/permission-keys";

export type SettingsCatalogResource =
  | "expense_types"
  | "income_types"
  | "ministry_categories";

export function settingsCatalogPermissionKey(
  resource: SettingsCatalogResource,
  action: "read" | "write" | "delete",
): PermissionKey {
  return `settings:${resource}:${action}` as PermissionKey;
}

export function canReadSettingsCatalog(
  permissions: readonly PermissionKey[],
  resource: SettingsCatalogResource,
): boolean {
  return permissions.includes(settingsCatalogPermissionKey(resource, "read"));
}

export function canWriteSettingsCatalog(
  permissions: readonly PermissionKey[],
  resource: SettingsCatalogResource,
): boolean {
  return permissions.includes(settingsCatalogPermissionKey(resource, "write"));
}

export function canDeleteSettingsCatalog(
  permissions: readonly PermissionKey[],
  resource: SettingsCatalogResource,
): boolean {
  return permissions.includes(settingsCatalogPermissionKey(resource, "delete"));
}
