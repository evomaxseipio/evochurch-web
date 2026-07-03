"use client";

import { Icons } from "@/components/icons";
import {
  churchAuthUserFullName,
  churchAuthUserInitials,
  formatLastLogin,
} from "@/lib/admin-users/parse";
import type { ChurchAuthUser } from "@/lib/admin-users/types";

export function RoleUsersDialog({
  roleName,
  users,
  open,
  onClose,
}: {
  roleName: string;
  users: ChurchAuthUser[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="drawer-backdrop"
        style={{ zIndex: 60 }}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-labelledby="role-users-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 61,
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          width: 480,
          maxWidth: "92vw",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <div
          className="row between"
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--line)",
            gap: 12,
          }}
        >
          <div>
            <div className="eyebrow">Usuarios del rol</div>
            <h3 id="role-users-title" style={{ margin: "4px 0 0", fontSize: 18 }}>
              {roleName}
            </h3>
          </div>
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Icons.x size={18} />
          </button>
        </div>

        <div style={{ padding: "12px 20px 20px", overflowY: "auto" }}>
          {users.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Ningún usuario tiene asignado este rol.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {users.map((user) => {
                const initials = churchAuthUserInitials(user);
                const bg = `linear-gradient(135deg, hsl(${(initials.charCodeAt(0) * 17) % 360} 50% 45%), hsl(${(initials.charCodeAt(1 % initials.length) * 23) % 360} 60% 35%))`;

                return (
                <li
                  key={user.authUserId}
                  className="row"
                  style={{
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--hairline)",
                    background: "var(--surface)",
                  }}
                >
                  <span className="avatar md" style={{ background: bg }}>
                    {initials}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {churchAuthUserFullName(user)}
                    </div>
                    <div className="muted tiny" style={{ marginTop: 2 }}>
                      {user.email}
                    </div>
                    <div className="muted tiny" style={{ marginTop: 4 }}>
                      Último acceso: {formatLastLogin(user.lastLoginAt)}
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
