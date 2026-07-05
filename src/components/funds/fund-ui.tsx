"use client";

import { Icons } from "@/components/icons";
import type { Fund } from "@/lib/funds/types";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function PrimaryBadge() {
  const t = useTranslations("funds");
  return (
    <span className="chip violet" style={{ fontWeight: 600 }}>
      <Icons.star size={11} /> {t("primaryFund")}
    </span>
  );
}

export function FundStatusChip({ active }: { active: boolean }) {
  const tCommon = useTranslations("common");
  return (
    <span
      className={`chip ${active ? "success" : ""}`.trim()}
      style={!active ? { color: "var(--ink-3)" } : undefined}
    >
      <span className="pip" /> {active ? tCommon("active") : tCommon("inactive")}
    </span>
  );
}

export function FundActionMenu({
  fund,
  onEdit,
  onAddTx,
  onMakePrimary,
  onViewTx,
  onViewContrib,
  onDelete,
}: {
  fund: Fund;
  onEdit: () => void;
  onAddTx: () => void;
  onMakePrimary: () => void;
  onViewTx: () => void;
  onViewContrib: () => void;
  onDelete?: () => void;
}) {
  const tCommon = useTranslations("common");
  const tFunds = useTranslations("funds");
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

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu = [
    {
      id: "edit",
      label: tCommon("edit"),
      icon: <Icons.edit size={15} />,
      on: onEdit,
    },
    {
      id: "add-tx",
      label: tFunds("addTransaction"),
      icon: <Icons.plus size={15} />,
      on: onAddTx,
    },
    !fund.isPrimary
      ? {
          id: "primary",
          label: tFunds("markPrimary"),
          icon: <Icons.star size={15} />,
          on: onMakePrimary,
          accent: true,
        }
      : null,
    {
      id: "tx",
      label: tFunds("viewTransactions"),
      icon: <Icons.list size={15} />,
      on: onViewTx,
    },
    {
      id: "contrib",
      label: tFunds("viewContributions"),
      icon: <Icons.wallet size={15} />,
      on: onViewContrib,
    },
    onDelete
      ? {
          id: "del",
          label: tCommon("delete"),
          icon: <Icons.trash size={15} />,
          on: onDelete,
          danger: true,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    on: () => void;
    accent?: boolean;
    danger?: boolean;
  }>;

  useLayoutEffect(() => {
    if (!open || !menuPanelRef.current || !menuRef.current) return;

    const btn = menuRef.current.querySelector("button");
    if (!btn) return;

    const panel = menuPanelRef.current;
    const height = panel.offsetHeight;
    const width = panel.offsetWidth;
    const r = btn.getBoundingClientRect();
    const gap = 6;
    const pad = 8;
    const viewportH = window.visualViewport?.height ?? window.innerHeight;
    const viewportW = window.visualViewport?.width ?? window.innerWidth;

    let left = r.left;
    if (left + width > viewportW - pad) {
      left = Math.max(pad, r.right - width);
    }

    let top = r.bottom + gap;
    if (top + height > viewportH - pad) {
      top = r.top - height - gap;
    }
    top = Math.max(pad, Math.min(top, viewportH - height - pad));

    setMenuPos((prev) => {
      if (prev && prev.top === top && prev.left === left) return prev;
      return { top, left };
    });
  }, [open, menu.length]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) {
      close();
      return;
    }

    const btn = menuRef.current?.querySelector("button");
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const minWidth = 200;
    const pad = 8;
    let left = r.left;
    if (left + minWidth > window.innerWidth - pad) {
      left = Math.max(pad, r.right - minWidth);
    }
    setMenuPos({ top: r.bottom + 6, left });
    setOpen(true);
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={menuRef}>
      <button
        type="button"
        className="btn ghost icon-only sm"
        onClick={toggle}
        title={tCommon("actions")}
        aria-label={tCommon("actions")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icons.menu size={16} />
      </button>
      {open && menuPos ? (
        <div
          ref={menuPanelRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 30,
            minWidth: 200,
            background: "var(--bg-1)",
            border: "1px solid var(--line)",
            borderRadius: 10,
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
                  style={{ height: 1, background: "var(--line)", margin: "4px 4px" }}
                />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  item.on();
                  close();
                }}
                className="action-menu-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 7,
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
