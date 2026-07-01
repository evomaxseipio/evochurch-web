"use client";

import { Icons, type IconName } from "@/components/icons";
import { toast } from "@/lib/toast";

export function QuickActions({
  actions,
  onAction,
}: {
  actions: { label: string; icon: IconName; color: string }[];
  onAction?: (label: string) => void;
}) {
  const handleAction = (label: string) => {
    if (onAction) {
      onAction(label);
      return;
    }
    toast.info("Acción", label);
  };

  return (
    <div className="col" style={{ gap: 8, marginTop: 14 }}>
      {actions.map((q) => {
        const Icon = Icons[q.icon];
        return (
          <button
            key={q.label}
            type="button"
            className="row"
            onClick={() => handleAction(q.label)}
            style={{
              gap: 10,
              padding: 10,
              borderRadius: 10,
              cursor: "pointer",
              border: "1px solid var(--hairline)",
              color: "var(--ink)",
              background: "transparent",
              width: "100%",
              textAlign: "left",
              font: "inherit",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                background: "var(--surface-2)",
                color: q.color,
              }}
            >
              <Icon size={18} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{q.label}</span>
          </button>
        );
      })}
    </div>
  );
}
