"use client";

import { Icons } from "@/components/icons";
import { Archive, ArchiveRestore } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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
  return (
    <button
      type="button"
      role="menuitem"
      className="action-menu-item"
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
        color: danger ? "var(--danger)" : "var(--fg)",
        background: "transparent",
      }}
    >
      <span style={{ display: "grid", placeItems: "center" }}>{icon}</span>
      {label}
    </button>
  );
}

export function OrganizationActionMenu({
  onEdit,
  onArchiveToggle,
  isArchived,
  onDelete,
}: {
  onEdit: () => void;
  onArchiveToggle: () => void;
  isArchived: boolean;
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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuH = 180;
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
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        className="icon-btn"
        title="Acciones"
        onClick={handleToggle}
      >
        <Icons.more size={16} />
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
            <MenuItem
              icon={<Icons.edit size={15} />}
              label="Editar"
              onClick={() => {
                close();
                onEdit();
              }}
            />
            <MenuItem
              icon={
                isArchived ? (
                  <ArchiveRestore size={15} />
                ) : (
                  <Archive size={15} />
                )
              }
              label={isArchived ? "Reactivar" : "Archivar"}
              onClick={() => {
                close();
                onArchiveToggle();
              }}
            />
            <div
              style={{
                height: 1,
                background: "var(--line)",
                margin: "4px 6px",
              }}
            />
            <MenuItem
              icon={<Icons.trash size={15} />}
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
