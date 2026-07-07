"use client";

import { Icons, NavIcon } from "@/components/icons";
import { ChurchLogo } from "@/components/brand/church-logo";
import { signOut } from "@/app/(auth)/login/actions";
import type { PermissionKey } from "@/lib/auth/permission-keys";
import {
  CONFIG_NAV,
  filterNavByPermissions,
  isNavGroup,
  MAIN_NAV,
  navIdFromPath,
  resolveNavEntryLabels,
  type NavItem,
} from "@/lib/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

function initials(label: string) {
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function NavGroupItem({
  entry,
  pathname,
  collapsed,
}: {
  entry: {
    id: string;
    label: string;
    icon: string;
    children: Array<NavItem & { label: string }>;
  };
  pathname: string;
  collapsed: boolean;
}) {
  const childIds = entry.children.map((c) => c.id);
  const activeId = navIdFromPath(pathname);
  const containsActive = childIds.includes(activeId);
  const [open, setOpen] = useState(containsActive);
  const [prevContainsActive, setPrevContainsActive] = useState(containsActive);

  if (containsActive !== prevContainsActive) {
    setPrevContainsActive(containsActive);
    if (containsActive) setOpen(true);
  }

  return (
    <div className="nav-group">
      <div
        className={`nav-item nav-parent ${containsActive ? "within" : ""} ${open ? "open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <span className="icon">
          <NavIcon name={entry.icon} />
        </span>
        <span className="label">{entry.label}</span>
        {!collapsed ? (
          <span
            className="chev"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          >
            <Icons.arrowDn size={14} />
          </span>
        ) : null}
      </div>
      {open && !collapsed ? (
        <div className="nav-children">
          {entry.children.map((child) => {
            const active = activeId === child.id;
            return (
              <Link
                key={child.id}
                href={child.href}
                className={`nav-item nav-child ${active ? "active" : ""}`}
              >
                <span className="dot" />
                <span className="label">{child.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: NavItem & { label: string };
  pathname: string;
}) {
  const activeId = navIdFromPath(pathname);
  const active = activeId === item.id;

  return (
    <Link
      href={item.href}
      className={`nav-item ${active ? "active" : ""}`}
    >
      <span className="icon">
        <NavIcon name={item.icon} />
      </span>
      <span className="label">{item.label}</span>
      {item.badge ? <span className="badge">{item.badge}</span> : null}
    </Link>
  );
}

export function Sidebar({
  churchName,
  churchShort,
  churchLogoUrl,
  userLabel,
  userRole,
  permissions = [],
  collapsed,
  onNavigate,
  className = "",
}: {
  churchName: string | null;
  churchShort?: string | null;
  churchLogoUrl?: string | null;
  userLabel: string;
  userRole?: string;
  permissions?: PermissionKey[];
  collapsed: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  const mainNav = useMemo(
    () =>
      resolveNavEntryLabels(
        filterNavByPermissions(MAIN_NAV, permissions),
        (k) => tNav(k),
      ),
    [permissions, tNav],
  );
  const configNav = useMemo(
    () =>
      resolveNavEntryLabels(
        filterNavByPermissions(CONFIG_NAV, permissions),
        (k) => tNav(k),
      ),
    [permissions, tNav],
  );

  return (
    <aside className={`sidebar${collapsed ? " is-collapsed" : ""} ${className}`.trim()}>
      <div className="sidebar-logo">
        <div className="mark" style={{ background: "transparent", boxShadow: "none" }}>
          <ChurchLogo logoUrl={churchLogoUrl} size={28} surface="dark" />
        </div>
        {!collapsed ? (
          <div>
            <div className="name">
              {churchShort ?? churchName ?? "Evo"}
              <em>Church</em>
            </div>
            <div className="sub">
              {churchName ?? "Consola web"}
            </div>
          </div>
        ) : null}
      </div>

      <nav className="nav-section" onClick={onNavigate}>
        <div className="nav-eyebrow">{tNav("sectionMain")}</div>
        {mainNav.map((entry) =>
          isNavGroup(entry) ? (
            <NavGroupItem
              key={entry.id}
              entry={entry}
              pathname={pathname}
              collapsed={collapsed}
            />
          ) : (
            <NavLink key={entry.id} item={entry} pathname={pathname} />
          ),
        )}
      </nav>

      <nav className="nav-section" onClick={onNavigate}>
        <div className="nav-eyebrow">{tNav("sectionConfig")}</div>
        {configNav.map((entry) =>
          isNavGroup(entry) ? (
            <NavGroupItem
              key={entry.id}
              entry={entry}
              pathname={pathname}
              collapsed={collapsed}
            />
          ) : (
            <NavLink key={entry.id} item={entry} pathname={pathname} />
          ),
        )}
      </nav>

      <div className="sidebar-foot">
        <form action={signOut}>
          <button
            type="submit"
            className="user-chip user-chip-btn"
            title={tCommon("signOut")}
          >
            <div className="avatar">{initials(userLabel)}</div>
            {!collapsed ? (
              <>
                <div className="meta">
                  <div className="nm">{userLabel}</div>
                  <div className="rl">
                    {userRole ?? "Admin"} · {churchShort ?? "Renacer"}
                  </div>
                </div>
                <span className="user-chip-more">
                  <Icons.more size={16} />
                </span>
              </>
            ) : null}
          </button>
        </form>
      </div>
    </aside>
  );
}
