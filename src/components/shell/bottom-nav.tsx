"use client";

import { Icons, NavIcon } from "@/components/icons";
import type { PermissionKey } from "@/lib/auth/permission-keys";
import {
  BOTTOM_NAV_LABEL_KEYS,
  filterNavByPermissions,
  isNavGroup,
  MAIN_NAV,
  navIdFromPath,
  resolveNavEntryLabels,
  type BottomNavId,
} from "@/lib/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type BottomItem =
  | {
      type: "link";
      id: BottomNavId;
      href: string;
      labelKey: string;
      icon: string;
      permission?: PermissionKey;
    }
  | { type: "finanzas"; id: "finanzas"; labelKey: string; icon: string };

const bottomItems: BottomItem[] = [
  {
    type: "link",
    id: "dashboard",
    href: "/dashboard",
    labelKey: "dashboard",
    icon: "home",
    permission: "dashboard:read",
  },
  {
    type: "link",
    id: "miembros",
    href: "/members",
    labelKey: "members",
    icon: "users",
    permission: "members:read",
  },
  { type: "finanzas", id: "finanzas", labelKey: "finances", icon: "wallet" },
  {
    type: "link",
    id: "comunicacion",
    href: "/comunicacion",
    labelKey: "comunicacion",
    icon: "chat",
    permission: "comunicacion:read",
  },
  {
    type: "link",
    id: "settings",
    href: "/settings",
    labelKey: "settings",
    icon: "settings",
    permission: "settings:read",
  },
];

export function BottomNav({ permissions = [] }: { permissions?: PermissionKey[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("nav");
  const activeId = navIdFromPath(pathname);
  const [finOpen, setFinOpen] = useState(false);

  const finChildren = useMemo(() => {
    const finGroup = resolveNavEntryLabels(
      filterNavByPermissions(MAIN_NAV, permissions),
      (k) => tNav(k),
    ).find((n) => n.id === "finanzas");
    return finGroup && isNavGroup(finGroup) ? finGroup.children : [];
  }, [permissions, tNav]);

  const visibleItems = useMemo(
    () =>
      bottomItems.filter((item) => {
        if (item.type === "finanzas") return finChildren.length > 0;
        if (item.type === "link" && item.permission) {
          return permissions.includes(item.permission);
        }
        return true;
      }),
    [permissions, finChildren.length],
  );

  const finRoutes = finChildren.map((c) => c.id);
  const finActive = finRoutes.includes(activeId);

  return (
    <nav className="bottom-nav">
      {visibleItems.map((item) => {
        const label = tNav(
          item.type === "link"
            ? BOTTOM_NAV_LABEL_KEYS[item.id]
            : item.labelKey,
        );

        if (item.type === "finanzas") {
          return (
            <div key={item.id} className="bn-wrap" style={{ flex: 1, position: "relative" }}>
              {finOpen ? (
                <>
                  <div
                    onClick={() => setFinOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 50 }}
                    aria-hidden
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 51,
                      minWidth: 190,
                      padding: 6,
                      background: "var(--bg-1)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-3)",
                    }}
                  >
                    {finChildren.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          router.push(c.href);
                          setFinOpen(false);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: 0,
                          cursor: "pointer",
                          font: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          background:
                            activeId === c.id ? "var(--accent-soft)" : "transparent",
                          color: activeId === c.id ? "var(--accent)" : "var(--fg)",
                        }}
                      >
                        {tNav(c.labelKey)}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <div
                className={`bn ${finActive ? "active" : ""}`}
                onClick={() => setFinOpen((o) => !o)}
                role="button"
                tabIndex={0}
              >
                <span className="icon">
                  <NavIcon name={item.icon} size={20} />
                </span>
                <span>{label}</span>
              </div>
            </div>
          );
        }

        const active = activeId === item.id;

        return (
          <Link key={item.id} href={item.href} className={`bn ${active ? "active" : ""}`}>
            <span className="icon">
              <NavIcon name={item.icon} size={20} />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
