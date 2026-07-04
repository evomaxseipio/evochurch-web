"use client";

import { Icons } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

function MenuItem({
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
  const color = danger ? "var(--danger)" : "var(--fg)";
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
        color,
        background: hover ? bg : "transparent",
        transition: "background 0.1s",
      }}
    >
      <span style={{ display: "grid", placeItems: "center", color }}>{icon}</span>
      {label}
    </button>
  );
}

/** Menú hamburguesa — `project/contribuciones.jsx` CoActionMenu */
export function ContributionActionMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({
    top: 0 as number | "auto",
    bottom: "auto" as number | "auto",
    left: 0 as number | "auto",
    right: "auto" as number | "auto",
  });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuW = 188;
      const menuH = 44 * 2 + 13;
      const openUp = window.innerHeight - r.bottom < menuH + 24;
      const openLeft = window.innerWidth - r.left < menuW + 8;
      setMenuPos({
        top: openUp ? "auto" : r.bottom + 6,
        bottom: openUp ? window.innerHeight - r.top + 6 : "auto",
        left: openLeft ? "auto" : r.left,
        right: openLeft ? window.innerWidth - r.right : "auto",
      });
    }
    setOpen((o) => !o);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={btnRef}
        type="button"
        className="btn ghost icon-only sm"
        title={tCommon("actions")}
        style={{ opacity: 1 }}
        onClick={handleToggle}
        aria-label={tCommon("actions")}
      >
        <Icons.menu size={16} />
      </button>
      {open ? (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 200 }}
          />
          <div
            role="menu"
            style={{
              position: "fixed",
              top: menuPos.top,
              bottom: menuPos.bottom,
              left: menuPos.left,
              right: menuPos.right,
              zIndex: 201,
              minWidth: 188,
              padding: 6,
              textAlign: "left",
              background: "var(--bg-1)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              boxShadow: "var(--shadow-3)",
            }}
          >
            <MenuItem
              icon={<Icons.edit size={15} />}
              label={tCommon("edit")}
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            />
            <div
              style={{ height: 1, background: "var(--line)", margin: "4px 6px" }}
            />
            <MenuItem
              icon={<Icons.trash size={15} />}
              label={tCommon("delete")}
              danger
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
