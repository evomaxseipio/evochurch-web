import { Sparkline } from "@/components/dashboard/sparkline";
import { Icons } from "@/components/icons";
import type { ReactNode, CSSProperties } from "react";

const iconBoxStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 9,
  flexShrink: 0,
  display: "grid",
  placeItems: "center",
};

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
  iconPosition = "right",
  tone,
  totalSummary,
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
  tone?: "d-funds" | "d-income" | "d-donation" | "d-system";
  totalSummary?: boolean;
}) {
  const deltaClass = deltaDir === "up" ? "up" : "dn";
  const sparkColor = feature ? "var(--glow)" : accent || "var(--accent)";
  const iconAccent = accent || "var(--d-funds)";

  const iconEl = icon ? (
    <div className={tone ? `ic ${tone}` : "ic"} style={tone ? iconBoxStyle : { ...iconBoxStyle, background: `color-mix(in oklab, ${iconAccent} 18%, transparent)`, color: iconAccent }}>
      {icon}
    </div>
  ) : null;

  const labelEl = (
    <span className="label" style={{ flex: icon ? 1 : undefined, minWidth: 0 }}>
      {label}
    </span>
  );

  return (
    <div
      className={`kpi ${kind}${feature ? " feature" : ""}${totalSummary ? " total-summary" : ""}`}
    >
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
