"use client";

import { Icons } from "@/components/icons";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

function CrudMenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const col = danger ? "var(--danger)" : "var(--fg)";
  const bg = danger
    ? "color-mix(in oklab, var(--danger) 12%, transparent)"
    : "var(--bg-2)";

  return (
    <button
      type="button"
      role="menuitem"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "8px 10px",
        borderRadius: 8,
        border: 0,
        cursor: "pointer",
        font: "inherit",
        fontSize: 13,
        fontWeight: 500,
        color: col,
        background: hover ? bg : "transparent",
        transition: "background 0.1s",
      }}
    >
      <span style={{ display: "grid", placeItems: "center", color: col }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

export function CrudActionMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number | "auto";
    bottom: number | "auto";
    left: number | "auto";
    right: number | "auto";
  }>({ top: 0, bottom: "auto", left: 0, right: "auto" });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuH = 44 * 2 + 20;
      const menuW = 180;
      const below = window.innerHeight - r.bottom;
      const toLeft = window.innerWidth - r.left;
      setPos({
        top: below < menuH + 16 ? "auto" : r.bottom + 6,
        bottom:
          below < menuH + 16 ? window.innerHeight - r.top + 6 : "auto",
        left: toLeft < menuW + 8 ? "auto" : r.left,
        right: toLeft < menuW + 8 ? window.innerWidth - r.right : "auto",
      });
    }
    setOpen((o) => !o);
  };

  const close = () => setOpen(false);

  return (
    <div style={{ display: "inline-block" }}>
      <button
        ref={btnRef}
        type="button"
        className="btn ghost icon-only sm"
        title="Acciones"
        onClick={handleToggle}
      >
        <Icons.menu width={16} />
      </button>
      {open ? (
        <>
          <div
            onClick={close}
            style={{ position: "fixed", inset: 0, zIndex: 200 }}
            aria-hidden
          />
          <div
            role="menu"
            style={{
              position: "fixed",
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              right: pos.right,
              zIndex: 201,
              minWidth: 180,
              padding: 6,
              textAlign: "left",
              background: "var(--bg-1)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              boxShadow: "var(--shadow-3)",
            }}
          >
            <CrudMenuItem
              icon={<Icons.edit width={15} />}
              label="Editar"
              onClick={() => {
                close();
                onEdit();
              }}
            />
            <div
              style={{
                height: 1,
                background: "var(--line)",
                margin: "4px 6px",
              }}
            />
            <CrudMenuItem
              icon={<Icons.trash width={15} />}
              label="Eliminar"
              danger
              onClick={() => {
                close();
                onDelete();
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
