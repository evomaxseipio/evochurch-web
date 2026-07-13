import type { OrgPermissionKey } from "@/lib/auth/org-permission-keys";
import { ORG_NAV } from "@/lib/org/navigation";

export const ORG_ROUTE_PERMISSIONS: Record<string, OrgPermissionKey> =
  Object.fromEntries(ORG_NAV.map((item) => [item.href, item.permission]));

export function orgPermissionForPath(pathname: string): OrgPermissionKey | null {
  const path = pathname.split("?")[0] ?? pathname;
  const entries = Object.entries(ORG_ROUTE_PERMISSIONS).sort(
    ([a], [b]) => b.length - a.length,
  );
  for (const [prefix, perm] of entries) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return perm;
    }
  }
  return null;
}
