"use client";

import { Icons } from "@/components/icons";
import { exportKey } from "@/lib/reports/download";
import type { ReportFormat, ReportId } from "@/lib/reports/types";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

const FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: "PDF",
  xlsx: "Excel",
};

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  loading,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled || loading}
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
        cursor: disabled || loading ? "not-allowed" : "pointer",
        font: "inherit",
        fontSize: 13,
        fontWeight: 500,
        color: disabled ? "var(--ink-4)" : "var(--fg)",
        background: hover && !disabled && !loading ? "var(--bg-2)" : "transparent",
        transition: "background 0.1s",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ display: "grid", placeItems: "center" }}>{icon}</span>
      {loading ? "…" : label}
    </button>
  );
}

export function ReportActionMenu({
  reportId,
  formats,
  canExport,
  previewLoading,
  exportingKey,
  onPreview,
  onExport,
}: {
  reportId: ReportId;
  formats: ReportFormat[];
  canExport: boolean;
  previewLoading?: boolean;
  exportingKey: string | null;
  onPreview: () => void;
  onExport: (format: ReportFormat) => void;
}) {
  const tCommon = useTranslations("common");
  const tReports = useTranslations("reports");
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({
    top: 0 as number | "auto",
    bottom: "auto" as number | "auto",
    left: 0 as number | "auto",
    right: "auto" as number | "auto",
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const exportBusy = exportingKey != null && exportingKey.startsWith(`${reportId}:`);

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
      const menuW = 200;
      const itemCount = 1 + formats.length;
      const menuH = 44 * itemCount + 13;
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
        aria-expanded={open}
      >
        <Icons.menu size={16} />
      </button>
      {open ? (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 200 }}
            aria-hidden
          />
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: menuPos.top,
              bottom: menuPos.bottom,
              left: menuPos.left,
              right: menuPos.right,
              zIndex: 201,
              minWidth: 200,
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
              label={
                previewLoading ? tReports("generating") : tCommon("preview")
              }
              loading={previewLoading}
              disabled={exportBusy && !previewLoading}
              onClick={() => {
                setOpen(false);
                onPreview();
              }}
            />
            {formats.length > 0 ? (
              <div
                style={{ height: 1, background: "var(--line)", margin: "4px 6px" }}
              />
            ) : null}
            {formats.map((format) => {
              const key = exportKey(reportId, format);
              const loading = exportingKey === key;
              return (
                <MenuItem
                  key={format}
                  icon={<Icons.download size={15} />}
                  label={FORMAT_LABELS[format]}
                  loading={loading}
                  disabled={!canExport || (exportBusy && !loading)}
                  onClick={() => {
                    setOpen(false);
                    if (canExport) onExport(format);
                  }}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
