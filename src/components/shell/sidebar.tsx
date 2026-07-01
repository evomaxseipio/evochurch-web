"use client";

import { Icons, NavIcon } from "@/components/icons";
import { signOut } from "@/app/(auth)/login/actions";
import {
  CONFIG_NAV,
  isNavGroup,
  MAIN_NAV,
  navIdFromPath,
  type NavEntry,
  type NavItem,
} from "@/lib/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
  entry: Extract<NavEntry, { children: NavItem[] }>;
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
  item: NavItem;
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
  userLabel,
  userRole,
  collapsed,
  onNavigate,
  className = "",
}: {
  churchName: string | null;
  churchShort?: string | null;
  userLabel: string;
  userRole?: string;
  collapsed: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar${collapsed ? " is-collapsed" : ""} ${className}`.trim()}>
      <div className="sidebar-logo">
        <div className="mark">
          <Icons.cross size={20} stroke="#fff" />
        </div>
        {!collapsed ? (
          <div>
            <div className="name">
              Evo<em>Church</em>
            </div>
            <div className="sub">
              {churchShort ?? churchName ?? "Renacer"} · ICCR
            </div>
          </div>
        ) : null}
      </div>

      <nav className="nav-section" onClick={onNavigate}>
        <div className="nav-eyebrow">Principal</div>
        {MAIN_NAV.map((entry) =>
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
        <div className="nav-eyebrow">Configuración</div>
        {CONFIG_NAV.map((item) => (
          <NavLink key={item.id} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="sidebar-foot">
        <form action={signOut}>
          <button
            type="submit"
            className="user-chip user-chip-btn"
            title="Cerrar sesión"
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
