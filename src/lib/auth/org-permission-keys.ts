/** Organization portal permission keys — sync with app_permissions seed. */
export const ORG_PERMISSION_KEYS = [
  "org:churches:read",
  "org:reports:read",
  "org:reports:aggregate",
  "org:churches:provision",
  "org:billing:read",
  "org:billing:write",
  "org:api:manage",
] as const;

export type OrgPermissionKey = (typeof ORG_PERMISSION_KEYS)[number];

export function isOrgPermissionKey(value: string): value is OrgPermissionKey {
  return (ORG_PERMISSION_KEYS as readonly string[]).includes(value);
}

export function parseOrgPermissionKeys(raw: unknown): OrgPermissionKey[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is OrgPermissionKey =>
      typeof item === "string" && isOrgPermissionKey(item),
  );
}
