import type { OrgPermissionKey } from "@/lib/auth/org-permission-keys";

export const ORG_ROUTE_PERMISSIONS: Record<string, OrgPermissionKey> = {
  "/org/dashboard": "org:reports:aggregate",
  "/org/churches": "org:churches:read",
  "/org/reports": "org:reports:read",
};

export function orgPermissionForPath(pathname: string): OrgPermissionKey | null {
  const entries = Object.entries(ORG_ROUTE_PERMISSIONS).sort(
    ([a], [b]) => b.length - a.length,
  );
  for (const [prefix, perm] of entries) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return perm;
    }
  }
  return null;
}
