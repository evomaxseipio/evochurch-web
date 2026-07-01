import { Icons, type IconName } from "@/components/icons";
import { Sparkline } from "@/components/dashboard/sparkline";

export function KpiCard({
  label,
  value,
  delta,
  deltaDir = "up",
  spark,
  feature = false,
  kind = "elevated",
  icon,
  accent = "var(--accent)",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaDir?: "up" | "down";
  spark?: number[];
  feature?: boolean;
  kind?: "flat" | "elevated" | "gradient";
  icon?: IconName;
  accent?: string;
}) {
  const deltaClass = deltaDir === "up" ? "up" : "dn";
  const Icon = icon ? Icons[icon] : null;
  const sparkColor = feature ? "var(--glow)" : accent;

  return (
    <div className={`kpi ${kind}${feature ? " feature" : ""}`}>
      <div
        className="head"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: Icon ? "space-between" : undefined,
        }}
      >
        {Icon ? (
          <div
            className="ic"
            style={{
              background: `color-mix(in oklab, ${accent} 18%, transparent)`,
              color: accent,
            }}
          >
            <Icon size={15} />
          </div>
        ) : null}
        <span className="label" style={{ textAlign: Icon ? "right" : undefined }}>
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div className="val" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </div>
        {delta ? (
          <span className={`delta ${deltaClass}`} style={{ flexShrink: 0, marginBottom: 4 }}>
            {deltaDir === "up" ? <Icons.arrowUp size={12} /> : <Icons.arrowDn size={12} />}
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
