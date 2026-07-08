"use client";

import { Icons } from "@/components/icons";
import type { OrgPermissionKey } from "@/lib/auth/org-permission-keys";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const NAV: Array<{
  href: string;
  labelKey: "dashboard" | "churches" | "reports";
  icon: keyof typeof Icons;
  permission: OrgPermissionKey;
}> = [
  {
    href: "/org/dashboard",
    labelKey: "dashboard",
    icon: "home",
    permission: "org:reports:aggregate",
  },
  {
    href: "/org/churches",
    labelKey: "churches",
    icon: "users",
    permission: "org:churches:read",
  },
  {
    href: "/org/reports",
    labelKey: "reports",
    icon: "download",
    permission: "org:reports:read",
  },
];

export function OrgShell({
  organizationName,
  userLabel,
  permissions,
  children,
}: {
  organizationName: string;
  userLabel: string;
  permissions: OrgPermissionKey[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("org.nav");

  const visibleNav = NAV.filter((item) => permissions.includes(item.permission));

  return (
    <div className="app-shell">
      <aside className="sidebar" style={{ width: 240 }}>
        <div className="sb-brand" style={{ padding: "20px 16px" }}>
          <div className="display" style={{ fontSize: 18, lineHeight: 1.2 }}>
            {organizationName}
          </div>
          <div className="text-xs opacity-80 mt-1">{t("portalLabel")}</div>
        </div>
        <nav className="sb-nav">
          {visibleNav.map((item) => {
            const Icon = Icons[item.icon];
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sb-item${active ? " active" : ""}`}
              >
                <Icon size={18} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sb-foot" style={{ padding: 16 }}>
          <div className="text-sm font-medium">{userLabel}</div>
        </div>
      </aside>
      <main style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div className="content">
          <div className="page">{children}</div>
        </div>
      </main>
    </div>
  );
}
