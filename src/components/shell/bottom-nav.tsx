"use client";

import { Icons, NavIcon } from "@/components/icons";
import { isNavGroup, MAIN_NAV, navIdFromPath } from "@/lib/navigation";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const finGroup = MAIN_NAV.find((n) => n.id === "finanzas");
const finChildren =
  finGroup && isNavGroup(finGroup) ? finGroup.children : [];

type BottomItem =
  | { type: "link"; id: string; href: string; label: string; icon: string }
  | { type: "finanzas"; id: string; label: string; icon: string };

const bottomItems: BottomItem[] = [
  { type: "link", id: "dashboard", href: "/dashboard", label: "Dashboard", icon: "home" },
  { type: "link", id: "miembros", href: "/members", label: "Miembros", icon: "users" },
  { type: "finanzas", id: "finanzas", label: "Finanzas", icon: "wallet" },
  { type: "link", id: "comunicacion", href: "/comunicacion", label: "Comunicación", icon: "chat" },
  { type: "link", id: "settings", href: "/settings", label: "Configuración", icon: "settings" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeId = navIdFromPath(pathname);
  const [finOpen, setFinOpen] = useState(false);

  const finRoutes = finChildren.map((c) => c.id);
  const finActive = finRoutes.includes(activeId);

  return (
    <nav className="bottom-nav">
      {bottomItems.map((item) => {
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
                        {c.label}
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
                <span>{item.label}</span>
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
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
