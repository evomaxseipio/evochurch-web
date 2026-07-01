"use client";

import { Icons } from "@/components/icons";
import { signOut } from "@/app/(auth)/login/actions";
import { applyTheme, resolveTheme, type Theme } from "@/lib/theme";
import { breadcrumbsFromPath } from "@/lib/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Clock } from "@/components/shell/clock";

function initials(label: string) {
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppTopbar({
  userLabel,
  userEmail,
  onToggleSidebar,
}: {
  userLabel: string;
  userEmail?: string | null;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const [crumb, page] = breadcrumbsFromPath(pathname);
  // Valor fijo en SSR/hidratación; se sincroniza con localStorage tras montar.
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
        style={{ display: "none" }}
      >
        <Icons.menu size={18} />
      </button>

      <div className="topbar-mobile-logo">
        <div className="mark" />
        <div className="name">
          Evo<em style={{ fontStyle: "italic", color: "var(--accent)" }}>Church</em>
        </div>
      </div>

      <div className="crumb" style={{ flex: 1 }}>
        <span>{crumb}</span>
        <span style={{ margin: "0 6px" }}>/</span>
        <b>{page}</b>
      </div>

      <div className="search">
        <Icons.search size={14} stroke="var(--muted)" />
        <input placeholder="Buscar miembros, transacciones, eventos…" />
        <kbd>⌘K</kbd>
      </div>

      <Clock />

      <button
        type="button"
        className="icon-btn"
        onClick={toggleTheme}
        title="Cambiar tema"
      >
        {theme === "dark" ? <Icons.sun size={18} /> : <Icons.moon size={18} />}
      </button>

      <button type="button" className="icon-btn" title="Notificaciones">
        <Icons.bell size={18} />
        <span className="dot" />
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setMenuOpen((o) => !o)}
          title="Cuenta"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {initials(userLabel)}
        </button>

        {menuOpen ? (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border py-1"
            style={{
              background: "var(--bg-1)",
              borderColor: "var(--line)",
              boxShadow: "var(--shadow-2)",
            }}
          >
            <div
              className="border-b px-4 py-3"
              style={{ borderColor: "var(--line)" }}
            >
              <p className="truncate text-sm font-semibold">{userLabel}</p>
              {userEmail ? (
                <p className="truncate text-xs" style={{ color: "var(--muted)" }}>
                  {userEmail}
                </p>
              ) : null}
            </div>
            <Link
              href="/dashboard"
              className="block px-4 py-2.5 text-sm"
              onClick={() => setMenuOpen(false)}
            >
              Mi cuenta
            </Link>
            <Link
              href="/settings"
              className="block px-4 py-2.5 text-sm"
              onClick={() => setMenuOpen(false)}
            >
              Configuración
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="block w-full px-4 py-2.5 text-left text-sm"
                style={{ color: "var(--danger)" }}
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
