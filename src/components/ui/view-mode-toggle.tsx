"use client";

import { Icons } from "@/components/icons";
import { useTranslations } from "next-intl";

export type ViewMode = "grid" | "list";

export function ViewModeToggle({
  view,
  onViewChange,
}: {
  view: ViewMode;
  onViewChange: (next: ViewMode) => void;
}) {
  const t = useTranslations("common");

  return (
    <div
      className="row"
      style={{
        gap: 4,
        padding: 4,
        background: "var(--surface-2)",
        borderRadius: 10,
      }}
    >
      {(["grid", "list"] as ViewMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onViewChange(mode)}
          className="btn sm icon-only"
          title={mode === "grid" ? t("gridView") : t("listView")}
          aria-label={mode === "grid" ? t("gridView") : t("listView")}
          style={{
            background: view === mode ? "var(--surface)" : "transparent",
            color: view === mode ? "var(--accent)" : "var(--ink-3)",
            boxShadow: view === mode ? "var(--shadow-1)" : "none",
            padding: 7,
          }}
        >
          {mode === "grid" ? (
            <Icons.grid size={16} />
          ) : (
            <Icons.list size={16} />
          )}
        </button>
      ))}
    </div>
  );
}
