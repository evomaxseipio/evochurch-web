"use client";

import { Icons } from "@/components/icons";
import { churchPath } from "@/lib/apps/church-routes";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

function MenuItem({
  icon,
  label,
  onClick,
  href,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const [hover, setHover] = useState(false);
  const style = {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 10,
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: 0,
    cursor: "pointer",
    font: "inherit" as const,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--fg)",
    background: hover ? "var(--bg-2)" : "transparent",
    transition: "background 0.1s",
    textDecoration: "none" as const,
    boxSizing: "border-box" as const,
  };

  if (href) {
    return (
      <Link
        href={href}
        role="menuitem"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={onClick}
        style={style}
      >
        <span style={{ display: "grid", placeItems: "center", color: "var(--muted)" }}>
          {icon}
        </span>
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={style}
    >
      <span style={{ display: "grid", placeItems: "center", color: "var(--muted)" }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

export function ChildActionMenu({
  childId,
  onEdit,
}: {
  childId: string;
  onEdit?: () => void;
}) {
  const t = useTranslations("children");
  const tCommon = useTranslations("common");
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

  function handleToggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const items = 1 + (onEdit ? 1 : 0);
      const menuH = 44 * items + 20;
      const menuW = 180;
      const below = window.innerHeight - r.bottom;
      const toLeft = window.innerWidth - r.left;
      setPos({
        top: below < menuH + 16 ? "auto" : r.bottom + 6,
        bottom: below < menuH + 16 ? window.innerHeight - r.top + 6 : "auto",
        left: toLeft < menuW + 8 ? "auto" : r.left,
        right: toLeft < menuW + 8 ? window.innerWidth - r.right : "auto",
      });
    }
    setOpen((o) => !o);
  }

  function close() {
    setOpen(false);
  }

  return (
    <div style={{ display: "inline-block" }}>
      <button
        ref={btnRef}
        type="button"
        className="btn ghost icon-only sm"
        title={tCommon("actions")}
        aria-label={tCommon("actions")}
        aria-expanded={open}
        onClick={handleToggle}
      >
        <Icons.menu size={16} />
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
              icon={<Icons.eye size={15} />}
              label={t("viewChild")}
              href={churchPath(`/members/children/${childId}`)}
              onClick={close}
            />
            {onEdit ? (
              <MenuItem
                icon={<Icons.edit size={15} />}
                label={tCommon("edit")}
                onClick={() => {
                  close();
                  onEdit();
                }}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
