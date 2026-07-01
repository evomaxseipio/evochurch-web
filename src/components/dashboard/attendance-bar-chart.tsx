import type { WeekPoint } from "@/lib/mock/dashboard-data";

export function AttendanceBarChart({
  data,
  height = 220,
}: {
  data: WeekPoint[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.v));
  const lastIdx = data.length - 1;

  return (
    <div style={{ height, display: "flex", alignItems: "flex-end", gap: 14, padding: "0 4px" }} role="img" aria-label="Gráfico de asistencia semanal">
      {data.map((d, i) => {
        const h = (d.v / max) * (height - 30);
        const isLast = i === lastIdx;
        return (
          <div key={d.w} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: "100%", height: h, position: "relative" }}>
              {isLast ? (
                <div
                  style={{
                    position: "absolute",
                    top: -28,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--ink)",
                    color: "var(--bg-elev)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.v.toLocaleString("es-DO")}
                </div>
              ) : null}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: isLast
                    ? `linear-gradient(180deg, var(--accent), var(--primary))`
                    : "var(--primary)",
                  borderRadius: "8px 8px 2px 2px",
                  opacity: isLast ? 1 : 0.85,
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{d.w}</div>
          </div>
        );
      })}
    </div>
  );
}
