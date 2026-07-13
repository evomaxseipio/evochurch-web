import type { OrgPermissionKey } from "@/lib/auth/org-permission-keys";
import {
  filterOrgNavByPermissions,
  ORG_ADMIN_NAV,
  ORG_MAIN_NAV,
  type OrgNavItem,
  type OrgNavLabelKey,
} from "@/lib/org/navigation";
import { getTranslations } from "next-intl/server";

export type OrgShellNavItem = OrgNavItem & { label: string };

export type OrgShellLabels = {
  portalLabel: string;
  sectionMain: string;
  sectionAdmin: string;
  searchPlaceholder: string;
  churchPortalLink: string;
  pageLabels: Record<OrgNavLabelKey, string>;
};

export async function resolveOrgShellNav(permissions: OrgPermissionKey[]): Promise<{
  labels: OrgShellLabels;
  mainNav: OrgShellNavItem[];
  adminNav: OrgShellNavItem[];
}> {
  const tNav = await getTranslations("org.nav");

  const labels: OrgShellLabels = {
    portalLabel: tNav("portalLabel"),
    sectionMain: tNav("sectionMain"),
    sectionAdmin: tNav("sectionAdmin"),
    searchPlaceholder: tNav("searchPlaceholder"),
    churchPortalLink: tNav("churchPortalLink"),
    pageLabels: {
      dashboard: tNav("dashboard"),
      churches: tNav("churches"),
      reports: tNav("reports"),
      settings: tNav("settings"),
    },
  };

  const mainNav = filterOrgNavByPermissions(ORG_MAIN_NAV, permissions).map(
    (item) => ({
      ...item,
      label: labels.pageLabels[item.labelKey],
    }),
  );

  const adminNav = filterOrgNavByPermissions(ORG_ADMIN_NAV, permissions).map(
    (item) => ({
      ...item,
      label: labels.pageLabels[item.labelKey],
    }),
  );

  return { labels, mainNav, adminNav };
}
