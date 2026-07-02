"use client";

import { Icons } from "@/components/icons";
import { memberFullName, memberInitials } from "@/lib/members/parse";
import type { Member } from "@/lib/members/types";
import {
  ministryColorCss,
  ministryLeaderNames,
} from "@/lib/ministries/parse";
import type { Ministry, MinistryColor } from "@/lib/ministries/types";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function MinistryIcon({
  name,
  color,
  size = 36,
  radius = 10,
  fontSize = 13,
}: {
  name: string;
  color: MinistryColor;
  size?: number;
  radius?: number;
  fontSize?: number;
}) {
  const css = ministryColorCss(color);

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: `color-mix(in oklab, ${css} 18%, transparent)`,
        color: css,
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize,
        fontFamily: "var(--font-mono)",
        letterSpacing: "-0.02em",
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function MinistryStatusChip({ active }: { active: boolean }) {
  return (
    <span
      className={`chip ${active ? "success" : ""}`.trim()}
      style={!active ? { color: "var(--ink-3)" } : undefined}
    >
      <span className="pip" /> {active ? "Activo" : "Inactivo"}
    </span>
  );
}

export function MinistryFeaturedBadge() {
  return (
    <span className="chip violet" style={{ fontWeight: 600 }}>
      <Icons.star size={11} /> Destacado
    </span>
  );
}

export function MemberAvatarStack({
  memberIds,
  members,
  max = 4,
}: {
  memberIds: string[];
  members: Member[];
  max?: number;
}) {
  const visible = memberIds.slice(0, max);
  const extra = memberIds.length - max;

  if (memberIds.length === 0) {
    return <span className="muted tiny">Sin miembros</span>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {visible.map((id, index) => {
        const member = members.find((m) => m.memberId === id);
        if (!member) return null;

        return (
          <span
            key={id}
            title={memberFullName(member)}
            style={{
              marginLeft: index === 0 ? 0 : -8,
              zIndex: max - index,
              position: "relative",
            }}
          >
            <span className="avatar sm">{memberInitials(member)}</span>
          </span>
        );
      })}
      {extra > 0 ? (
        <span
          className="chip"
          style={{ marginLeft: 4, fontSize: 11, padding: "2px 7px" }}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

export function MinistryLeaderRow({
  ministry,
  members,
}: {
  ministry: Ministry;
  members: Member[];
}) {
  const names = ministryLeaderNames(ministry, members);
  const leaderIds = Array.isArray(ministry.leaderProfileIds)
    ? ministry.leaderProfileIds
    : [];

  if (leaderIds.length === 0) {
    return <span className="muted tiny">—</span>;
  }

  return (
    <div className="row" style={{ gap: 8, alignItems: "center", minWidth: 0 }}>
      <MemberAvatarStack
        memberIds={leaderIds}
        members={members}
        max={2}
      />
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {names}
      </span>
    </div>
  );
}

type MenuItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
};

export function MinistryActionMenu({
  ministry: _ministry,
  onEdit,
  onViewMembers,
  onAssignLeader,
  onViewEvents,
  onDelete,
}: {
  ministry: Ministry;
  onEdit: () => void;
  onViewMembers: () => void;
  onAssignLeader: () => void;
  onViewEvents: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setMenuPos(null);
  };

  const menu: MenuItem[] = [
    {
      id: "edit",
      label: "Editar",
      icon: <Icons.edit size={15} />,
      onClick: onEdit,
    },
    {
      id: "members",
      label: "Ver miembros",
      icon: <Icons.users size={15} />,
      onClick: onViewMembers,
    },
    {
      id: "leader",
      label: "Asignar líderes",
      icon: <Icons.star size={15} />,
      onClick: onAssignLeader,
      accent: true,
    },
    {
      id: "events",
      label: "Ver eventos",
      icon: <Icons.cal size={15} />,
      onClick: onViewEvents,
    },
    {
      id: "delete",
      label: "Eliminar",
      icon: <Icons.trash size={15} />,
      onClick: onDelete,
      danger: true,
    },
  ];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        close();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !menuPanelRef.current || !menuRef.current) return;

    const button = menuRef.current.querySelector("button");
    if (!button) return;

    const panel = menuPanelRef.current;
    const height = panel.offsetHeight;
    const width = panel.offsetWidth;
    const rect = button.getBoundingClientRect();
    const gap = 6;
    const pad = 8;
    const viewportH = window.visualViewport?.height ?? window.innerHeight;
    const viewportW = window.visualViewport?.width ?? window.innerWidth;

    let left = rect.left;
    if (left + width > viewportW - pad) {
      left = Math.max(pad, rect.right - width);
    }

    let top = rect.bottom + gap;
    if (top + height > viewportH - pad) {
      top = rect.top - height - gap;
    }
    top = Math.max(pad, Math.min(top, viewportH - height - pad));

    setMenuPos((prev) => {
      if (prev && prev.top === top && prev.left === left) return prev;
      return { top, left };
    });
  }, [open, menu.length]);

  function toggle(event: React.MouseEvent) {
    event.stopPropagation();
    if (open) {
      close();
      return;
    }

    const button = menuRef.current?.querySelector("button");
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const minWidth = 210;
    const pad = 8;
    let left = rect.left;
    if (left + minWidth > window.innerWidth - pad) {
      left = Math.max(pad, rect.right - minWidth);
    }
    setMenuPos({ top: rect.bottom + 6, left });
    setOpen(true);
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={menuRef}>
      <button
        type="button"
        className="btn ghost icon-only sm"
        onClick={toggle}
        title="Acciones"
        aria-label="Acciones"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icons.menu size={16} />
      </button>
      {open && menuPos ? (
        <div
          ref={menuPanelRef}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 30,
            minWidth: 210,
            background: "var(--bg-1)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            boxShadow: "var(--shadow-3)",
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {menu.map((item, index) => (
            <div key={item.id}>
              {index === menu.length - 1 ? (
                <div
                  style={{
                    height: 1,
                    background: "var(--line)",
                    margin: "4px 6px",
                  }}
                />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  item.onClick();
                  close();
                }}
                className="action-menu-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "transparent",
                  border: 0,
                  color: item.danger
                    ? "var(--danger)"
                    : item.accent
                      ? "var(--accent)"
                      : "var(--fg)",
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 16,
                    display: "inline-grid",
                    placeItems: "center",
                    color: item.danger
                      ? "var(--danger)"
                      : item.accent
                        ? "var(--accent)"
                        : "var(--muted)",
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
