"use client";

import { SessionIdleGuard } from "@/components/auth/session-idle-guard";
import { AppTopbar } from "@/components/shell/app-topbar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { Sidebar } from "@/components/shell/sidebar";
import type { PermissionKey } from "@/lib/auth/permission-keys";
import { SESSION_IDLE_ENABLED } from "@/lib/auth/session-idle";
import { useCallback, useState } from "react";

const SIDEBAR_KEY = "evochurch-sidebar-collapsed";

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_KEY) === "true";
}

export function AppShell({
  churchName,
  churchShort,
  userLabel,
  userEmail,
  userRole,
  permissions = [],
  children,
}: {
  churchName: string | null;
  churchShort?: string | null;
  userLabel: string;
  userEmail?: string | null;
  userRole?: string;
  permissions?: PermissionKey[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window === "undefined" ? false : readSidebarCollapsed(),
  );

  const handleToggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <div className={`app-shell${collapsed ? " collapsed" : ""}`}>
      <Sidebar
        churchName={churchName}
        churchShort={churchShort}
        userLabel={userLabel}
        userRole={userRole}
        permissions={permissions}
        collapsed={collapsed}
      />

      <main style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <AppTopbar
          userLabel={userLabel}
          userEmail={userEmail}
          onToggleSidebar={handleToggleSidebar}
        />
        <div className="content">
          <div className="page">{children}</div>
        </div>
      </main>

      <BottomNav permissions={permissions} />
      {SESSION_IDLE_ENABLED ? <SessionIdleGuard /> : null}
    </div>
  );
}
