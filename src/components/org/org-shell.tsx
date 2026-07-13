"use client";

import { signOut } from "@/app/(auth)/login/actions";
import { ChurchLogo } from "@/components/brand/church-logo";
import { Icons } from "@/components/icons";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { orgBreadcrumbFromPath } from "@/lib/org/navigation";
import type {
  OrgShellLabels,
  OrgShellNavItem,
} from "@/lib/org/resolve-org-shell-nav";
import { applyTheme, resolveTheme, type Theme } from "@/lib/theme";
import {
  Building2,
  FileText,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const SIDEBAR_KEY = "evochurch-org-sidebar-collapsed";

const NAV_ICONS = {
  dashboard: <LayoutDashboard size={18} />,
  churches: <Building2 size={18} />,
  reports: <FileText size={18} />,
  settings: <KeyRound size={18} />,
} as const;

function initials(label: string) {
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_KEY) === "true";
}

function OrgNavLink({
  item,
  pathname,
}: {
  item: OrgShellNavItem;
  pathname: string;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={`nav-item${active ? " active" : ""}`}
      title={item.label}
    >
      <span className="icon">{NAV_ICONS[item.icon]}</span>
      <span className="label">{item.label}</span>
    </Link>
  );
}

function OrgSidebar({
  organizationName,
  organizationShort,
  logoUrl,
  userLabel,
  userRole,
  labels,
  mainNav,
  adminNav,
  collapsed,
  onNavigate,
}: {
  organizationName: string;
  organizationShort: string;
  logoUrl?: string | null;
  userLabel: string;
  userRole: string;
  labels: OrgShellLabels;
  mainNav: OrgShellNavItem[];
  adminNav: OrgShellNavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const tCommon = useTranslations("common");

  return (
    <aside className={`sidebar${collapsed ? " is-collapsed" : ""}`}>
      <div className="sidebar-logo">
        <div className="mark" style={{ background: "transparent", boxShadow: "none" }}>
          {logoUrl ? (
            <ChurchLogo
              logoUrl={logoUrl}
              size={28}
              surface="dark"
              alt={organizationName}
            />
          ) : (
            <LayoutGrid size={16} color="#fff" />
          )}
        </div>
        {!collapsed ? (
          <div style={{ minWidth: 0 }}>
            <div
              className="name"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={organizationName}
            >
              {organizationShort}
            </div>
            <div className="sub">{labels.portalLabel}</div>
          </div>
        ) : null}
      </div>

      <nav className="nav-section" onClick={onNavigate}>
        <div className="nav-eyebrow">{labels.sectionMain}</div>
        {mainNav.map((item) => (
          <OrgNavLink key={item.id} item={item} pathname={pathname} />
        ))}
      </nav>

      {adminNav.length > 0 ? (
        <nav
          className="nav-section"
          style={{ marginTop: "auto", borderTop: "1px solid var(--line)" }}
          onClick={onNavigate}
        >
          <div className="nav-eyebrow">{labels.sectionAdmin}</div>
          {adminNav.map((item) => (
            <OrgNavLink key={item.id} item={item} pathname={pathname} />
          ))}
        </nav>
      ) : null}

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
                  <div className="rl">{userRole}</div>
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

function OrgTopbar({
  userLabel,
  userEmail,
  labels,
  onToggleSidebar,
}: {
  userLabel: string;
  userEmail: string;
  labels: OrgShellLabels;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const tCommon = useTranslations("common");
  const crumb = useMemo(
    () => orgBreadcrumbFromPath(pathname, labels.pageLabels),
    [pathname, labels.pageLabels],
  );
  const [theme, setTheme] = useState<Theme>("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromDom = document.documentElement.getAttribute("data-theme");
    if (fromDom === "light" || fromDom === "dark") {
      setTheme(fromDom);
      return;
    }
    setTheme(resolveTheme());
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-btn mobile-drawer-toggle"
        onClick={onToggleSidebar}
        aria-label={tCommon("menu")}
      >
        <Icons.menu size={18} />
      </button>

      <div className="topbar-mobile-logo">
        <div className="mark" />
        <div className="name">
          Evo<em style={{ fontStyle: "italic", color: "var(--accent)" }}>Council</em>
        </div>
      </div>

      <div className="crumb">
        <span>{crumb.section}</span>
        <span className="sep" style={{ margin: "0 6px" }}>
          /
        </span>
        <b>{crumb.page}</b>
      </div>

      <div className="search" style={{ width: 280, flexShrink: 0 }}>
        <Search size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
        <input
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchPlaceholder}
        />
        <kbd>⌘K</kbd>
      </div>

      <div className="grow" />

      <LocaleSwitcher variant="compact" />

      <button
        type="button"
        className="icon-btn"
        onClick={toggleTheme}
        aria-label={tCommon("themeToggle")}
        title={tCommon("themeToggle")}
      >
        {theme === "light" ? <Icons.moon size={18} /> : <Icons.sun size={18} />}
      </button>

      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label={tCommon("account")}
        >
          <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
            {initials(userLabel)}
          </div>
        </button>
        {menuOpen ? (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              minWidth: 220,
              padding: 6,
              background: "var(--bg-1)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              boxShadow: "var(--shadow-3)",
              zIndex: 30,
            }}
          >
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{userLabel}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{userEmail}</div>
            </div>
            <Link
              href="/login"
              className="action-menu-item"
              style={{
                display: "block",
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                color: "var(--fg-dim)",
              }}
              onClick={() => setMenuOpen(false)}
            >
              {labels.churchPortalLink}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="action-menu-item"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 10px",
                  border: 0,
                  background: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: 13,
                  color: "var(--fg-dim)",
                }}
              >
                {tCommon("signOut")}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function OrgShell({
  organizationName,
  organizationShort,
  logoUrl,
  userLabel,
  userEmail,
  userRole,
  labels,
  mainNav,
  adminNav,
  children,
}: {
  organizationName: string;
  organizationShort: string;
  logoUrl?: string | null;
  userLabel: string;
  userEmail: string;
  userRole: string;
  labels: OrgShellLabels;
  mainNav: OrgShellNavItem[];
  adminNav: OrgShellNavItem[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window === "undefined" ? false : readSidebarCollapsed(),
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 900) {
      setMobileOpen((o) => !o);
      return;
    }
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <div className={`app-shell${collapsed ? " collapsed" : ""}`}>
      <OrgSidebar
        organizationName={organizationName}
        organizationShort={organizationShort}
        logoUrl={logoUrl}
        userLabel={userLabel}
        userRole={userRole}
        labels={labels}
        mainNav={mainNav}
        adminNav={adminNav}
        collapsed={collapsed}
        onNavigate={() => setMobileOpen(false)}
      />

      {mobileOpen ? (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div
            style={{
              position: "fixed",
              inset: "0 auto 0 0",
              zIndex: 52,
              width: 252,
            }}
          >
            <OrgSidebar
              organizationName={organizationName}
              organizationShort={organizationShort}
              logoUrl={logoUrl}
              userLabel={userLabel}
              userRole={userRole}
              labels={labels}
              mainNav={mainNav}
              adminNav={adminNav}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      ) : null}

      <main style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <OrgTopbar
          userLabel={userLabel}
          userEmail={userEmail}
          labels={labels}
          onToggleSidebar={handleToggleSidebar}
        />
        <div className="content">
          <div className="page">{children}</div>
        </div>
      </main>
    </div>
  );
}
