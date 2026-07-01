import { Sparkline } from "@/components/dashboard/sparkline";
import { Icons } from "@/components/icons";
import type { ReactNode } from "react";

/** KPI de finanzas — igual que `KPI` en `project/components.jsx`. */
export function FundsKpi({
  label,
  value,
  delta,
  deltaDir = "up",
  spark,
  kind = "elevated",
  feature,
  accent,
  icon,
  iconPosition = "left",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaDir?: "up" | "down";
  spark?: number[];
  kind?: "flat" | "elevated" | "gradient";
  feature?: boolean;
  accent?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}) {
  const deltaClass = deltaDir === "up" ? "up" : "dn";
  const sparkColor = feature ? "var(--glow)" : accent || "var(--accent)";

  const iconEl = icon ? (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        background: `color-mix(in oklab, ${accent || "var(--d-funds)"} 18%, transparent)`,
        color: accent || "var(--d-funds)",
      }}
    >
      {icon}
    </div>
  ) : null;

  const labelEl = (
    <span
      className="label"
      style={{
        flex: icon ? 1 : undefined,
        minWidth: 0,
        textAlign: icon && iconPosition === "left" ? "right" : undefined,
      }}
    >
      {label}
    </span>
  );

  return (
    <div className={`kpi ${kind}${feature ? " feature" : ""}`}>
      <div
        className="head"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: icon ? "space-between" : undefined,
          gap: 10,
        }}
      >
        {icon && iconPosition === "right" ? (
          <>
            {labelEl}
            {iconEl}
          </>
        ) : (
          <>
            {iconEl}
            {labelEl}
          </>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          className="val"
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
        {delta ? (
          <span
            className={`delta ${deltaClass}`}
            style={{ flexShrink: 0, marginBottom: 4 }}
          >
            {deltaDir === "up" ? (
              <Icons.arrowUp size={12} />
            ) : (
              <Icons.arrowDn size={12} />
            )}
            {delta}
          </span>
        ) : null}
      </div>
      {spark ? (
        <div className="spark">
          <Sparkline data={spark} color={sparkColor} />
        </div>
      ) : null}
    </div>
  );
}
