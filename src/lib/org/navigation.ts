import { orgPath } from "@/lib/apps/org-routes";
import type { OrgPermissionKey } from "@/lib/auth/org-permission-keys";

export type OrgNavSection = "main" | "admin";

export type OrgNavItem = {
  id: OrgModuleId;
  href: string;
  labelKey: OrgNavLabelKey;
  icon: OrgNavIcon;
  permission: OrgPermissionKey;
  section: OrgNavSection;
};

export type OrgModuleId = "dashboard" | "churches" | "reports" | "settings";
export type OrgNavLabelKey =
  | "dashboard"
  | "churches"
  | "reports"
  | "settings";

export type OrgNavIcon =
  | "dashboard"
  | "churches"
  | "reports"
  | "settings";

export const ORG_MAIN_NAV: OrgNavItem[] = [
  {
    id: "dashboard",
    href: orgPath("dashboard"),
    labelKey: "dashboard",
    icon: "dashboard",
    permission: "org:reports:aggregate",
    section: "main",
  },
  {
    id: "churches",
    href: orgPath("churches"),
    labelKey: "churches",
    icon: "churches",
    permission: "org:churches:read",
    section: "main",
  },
  {
    id: "reports",
    href: orgPath("reports"),
    labelKey: "reports",
    icon: "reports",
    permission: "org:reports:read",
    section: "main",
  },
];

export const ORG_ADMIN_NAV: OrgNavItem[] = [
  {
    id: "settings",
    href: orgPath("settings"),
    labelKey: "settings",
    icon: "settings",
    permission: "org:api:manage",
    section: "admin",
  },
];

export const ORG_NAV: OrgNavItem[] = [...ORG_MAIN_NAV, ...ORG_ADMIN_NAV];

export function filterOrgNavByPermissions(
  items: OrgNavItem[],
  permissions: OrgPermissionKey[],
): OrgNavItem[] {
  return items.filter((item) => permissions.includes(item.permission));
}

export function orgNavIdFromPath(pathname: string): OrgModuleId | null {
  const path = pathname.split("?")[0] ?? pathname;
  for (const item of ORG_NAV) {
    if (path === item.href || path.startsWith(`${item.href}/`)) {
      return item.id;
    }
  }
  return null;
}

export function orgBreadcrumbFromPath(
  pathname: string,
  pageLabels: Record<OrgNavLabelKey, string>,
): { section: string; page: string } {
  const activeId = orgNavIdFromPath(pathname);
  const active = ORG_NAV.find((item) => item.id === activeId);
  return {
    section: "Concilio",
    page: active ? pageLabels[active.labelKey] : "Inicio",
  };
}
