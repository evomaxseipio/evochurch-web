import type { IncomeExpenseBarPoint } from "@/lib/dashboard/types";
import { buildYAxisTicks, niceChartMax } from "@/lib/dashboard/chart-axis";
import { fmtRDshort } from "@/lib/format-currency";

const AXIS_W = 52;

export function IncomeExpenseBarChart({
  data,
  height = 220,
}: {
  data: IncomeExpenseBarPoint[];
  height?: number;
}) {
  const rawMax = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const max = niceChartMax(rawMax);
  const ticks = buildYAxisTicks(rawMax, 3);
  const plotH = height - 36;

  return (
    <div
      style={{ display: "flex", gap: 8, height }}
      role="img"
      aria-label="Gráfico de ingresos y egresos"
    >
      <div
        style={{
          width: AXIS_W,
          height: plotH,
          position: "relative",
          flexShrink: 0,
        }}
      >
        {ticks
          .slice()
          .reverse()
          .map((tick) => {
            const y = plotH - (tick / max) * plotH;
            return (
              <span
                key={tick}
                className="tiny"
                style={{
                  position: "absolute",
                  right: 0,
                  top: y,
                  transform: "translateY(-50%)",
                  color: "var(--ink-3)",
                  fontSize: 10,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {fmtRDshort(tick)}
              </span>
            );
          })}
      </div>

      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: `0 0 36px 0`,
            pointerEvents: "none",
          }}
        >
          {ticks.map((tick) => {
            const y = plotH - (tick / max) * plotH;
            return (
              <div
                key={tick}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: y,
                  height: 1,
                  background: "var(--hairline)",
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            height: plotH,
            padding: "0 4px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {data.map((point) => {
            const incomeH = (point.income / max) * plotH;
            const expenseH = (point.expense / max) * plotH;
            return (
              <div
                key={point.label}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  className="row"
                  style={{
                    width: "100%",
                    height: plotH,
                    alignItems: "flex-end",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <div
                    title={`Ingresos ${fmtRDshort(point.income)}`}
                    style={{
                      width: "42%",
                      height: Math.max(incomeH, point.income > 0 ? 4 : 0),
                      background:
                        "linear-gradient(180deg, var(--success), color-mix(in oklab, var(--success) 70%, black))",
                      borderRadius: "6px 6px 2px 2px",
                    }}
                  />
                  <div
                    title={`Egresos ${fmtRDshort(point.expense)}`}
                    style={{
                      width: "42%",
                      height: Math.max(expenseH, point.expense > 0 ? 4 : 0),
                      background:
                        "linear-gradient(180deg, var(--danger), color-mix(in oklab, var(--danger) 70%, black))",
                      borderRadius: "6px 6px 2px 2px",
                      opacity: 0.9,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ink-3)",
                    fontWeight: 600,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {point.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
