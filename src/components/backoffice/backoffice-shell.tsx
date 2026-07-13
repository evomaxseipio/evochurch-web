"use client";

import { signOut } from "@/app/(auth)/login/actions";
import { Icons } from "@/components/icons";
import { BACKOFFICE_APP_PREFIX, backofficePath } from "@/lib/apps/backoffice-routes";
import { applyTheme, resolveTheme, type Theme } from "@/lib/theme";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CreditCard,
  Kanban,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  Receipt,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const SIDEBAR_KEY = "evochurch-backoffice-sidebar-collapsed";

type NavItem = {
  label: string;
  href?: string;
  icon: ReactNode;
  disabled?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: backofficePath("sales"),
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: "Organizaciones",
    href: backofficePath("organizations"),
    icon: <Building2 size={18} />,
  },
  {
    label: "Pipeline",
    href: backofficePath("pipeline"),
    icon: <Kanban size={18} />,
  },
  {
    label: "Agenda",
    href: backofficePath("agenda"),
    icon: <CalendarDays size={18} />,
  },
];

const NAV_FOOTER_ITEMS: NavItem[] = [
  {
    label: "Suscripciones",
    href: backofficePath("subscriptions"),
    icon: <Receipt size={18} />,
    disabled: true,
  },
  {
    label: "Facturación",
    href: backofficePath("billing"),
    icon: <CreditCard size={18} />,
    disabled: true,
  },
  {
    label: "Soporte",
    href: backofficePath("support"),
    icon: <LifeBuoy size={18} />,
    disabled: true,
  },
];

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

function breadcrumbFromPath(pathname: string): { section: string; page: string } {
  if (pathname.startsWith(backofficePath("organizations/"))) {
    return { section: "Sales", page: "Detalle" };
  }
  if (pathname.startsWith(backofficePath("organizations"))) {
    return { section: "Sales", page: "Organizaciones" };
  }
  if (pathname.startsWith(backofficePath("pipeline"))) {
    return { section: "Sales", page: "Pipeline" };
  }
  if (pathname.startsWith(backofficePath("agenda"))) {
    return { section: "Sales", page: "Agenda" };
  }
  if (pathname.startsWith(backofficePath("sales"))) {
    return { section: "Sales", page: "Dashboard" };
  }
  return { section: "BackOffice", page: "Inicio" };
}

function BackofficeSidebar({
  userLabel,
  collapsed,
  onNavigate,
}: {
  userLabel: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar${collapsed ? " is-collapsed" : ""}`}>
      <div className="sidebar-logo">
        <div className="mark">
          <LayoutGrid size={16} color="#fff" />
        </div>
        {!collapsed ? (
          <div>
            <div className="name">
              Evo<em>Church</em>
            </div>
            <div className="sub">BackOffice · Sales</div>
          </div>
        ) : null}
      </div>

      <nav className="nav-section" onClick={onNavigate}>
        <div className="nav-eyebrow">Sales Hub</div>
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === backofficePath("sales")
              ? pathname === item.href || pathname === BACKOFFICE_APP_PREFIX
              : item.href
                ? pathname.startsWith(item.href)
                : false;
          if (item.disabled || !item.href) {
            return (
              <span
                key={item.label}
                className="nav-item disabled"
                title="Próximamente"
              >
                <span className="icon">{item.icon}</span>
                <span className="label">{item.label}</span>
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${active ? " active" : ""}`}
            >
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <nav
        className="nav-section"
        style={{ marginTop: "auto", borderTop: "1px solid var(--line)" }}
        onClick={onNavigate}
      >
        {NAV_FOOTER_ITEMS.map((item) => (
          <span
            key={item.label}
            className="nav-item disabled"
            title="Próximamente"
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </span>
        ))}
      </nav>

      <div className="sidebar-foot">
        <form action={signOut}>
          <button type="submit" className="user-chip user-chip-btn" title="Cerrar sesión">
            <div className="avatar">{initials(userLabel)}</div>
            {!collapsed ? (
              <>
                <div className="meta">
                  <div className="nm">{userLabel}</div>
                  <div className="rl">BackOffice</div>
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

function BackofficeTopbar({
  userLabel,
  userEmail,
  onToggleSidebar,
}: {
  userLabel: string;
  userEmail: string;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const crumb = useMemo(() => breadcrumbFromPath(pathname), [pathname]);
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
        aria-label="Menú"
      >
        <Icons.menu size={18} />
      </button>

      <div className="topbar-mobile-logo">
        <div className="mark" />
        <div className="name">
          Evo<em style={{ fontStyle: "italic", color: "var(--accent)" }}>Church</em>
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
        <input placeholder="Buscar…" aria-label="Buscar en BackOffice" />
        <kbd>⌘K</kbd>
      </div>

      <div className="grow" />

      <button
        type="button"
        className="icon-btn"
        onClick={toggleTheme}
        aria-label={theme === "light" ? "Modo oscuro" : "Modo claro"}
        title={theme === "light" ? "Modo oscuro" : "Modo claro"}
      >
        {theme === "light" ? <Icons.moon size={18} /> : <Icons.sun size={18} />}
      </button>

      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label="Cuenta"
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
                Cerrar sesión
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function BackofficeShell({
  children,
  userLabel,
  userEmail,
}: {
  children: ReactNode;
  userLabel: string;
  userEmail: string;
}) {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window === "undefined" ? false : readSidebarCollapsed(),
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 800) {
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
      <BackofficeSidebar
        userLabel={userLabel}
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
              width: 240,
            }}
          >
            <BackofficeSidebar
              userLabel={userLabel}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      ) : null}

      <main style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <BackofficeTopbar
          userLabel={userLabel}
          userEmail={userEmail}
          onToggleSidebar={handleToggleSidebar}
        />
        <div className="content">
          <div className="page">{children}</div>
        </div>
      </main>
    </div>
  );
}
