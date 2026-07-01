"use client";

import type { ChartPoint } from "@/lib/dashboard/types";
import { buildYAxisTicks, niceChartMax } from "@/lib/dashboard/chart-axis";
import { fmtRD, fmtRDshort } from "@/lib/format-currency";
import { useCallback, useId, useMemo, useState } from "react";

type PlotPoint = ChartPoint & { x: number; y: number };

function nearestIndex(clientX: number, rect: DOMRect, points: PlotPoint[]): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return 0;

  const relX = (clientX - rect.left) / rect.width;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const px = points[i].x / 600;
    const dist = Math.abs(relX - px);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

export function ContributionsLineChart({
  data,
  height = 180,
}: {
  data: ChartPoint[];
  height?: number;
}) {
  const gradientId = useId().replace(/:/g, "");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const w = 600;
  const h = height;
  const rawMax = Math.max(...data.map((d) => d.value), 0);
  const max = niceChartMax(Math.max(rawMax, 1));
  const pad = { l: 58, r: 12, t: 28, b: 32 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const pts = useMemo<PlotPoint[]>(() => {
    if (data.length === 0) return [];
    return data.map((d, i) => {
      const x = pad.l + (i * innerW) / (data.length - 1 || 1);
      const y = pad.t + innerH - (d.value / max) * innerH;
      return { x, y, ...d };
    });
  }, [data, innerH, innerW, max, pad.l, pad.t]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pts.length === 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      setActiveIndex(nearestIndex(event.clientX, rect, pts));
    },
    [pts],
  );

  const handlePointerLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  if (data.length === 0) {
    return (
      <div
        className="muted"
        style={{
          height,
          display: "grid",
          placeItems: "center",
          fontSize: 13,
        }}
      >
        Sin contribuciones en este periodo
      </div>
    );
  }

  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${pad.t + innerH} L ${pts[0].x} ${pad.t + innerH} Z`;
  const ticks = buildYAxisTicks(rawMax, 3).map((v) => ({
    y: pad.t + innerH - (v / max) * innerH,
    v,
  }));

  const active = activeIndex != null ? pts[activeIndex] : null;
  const tooltipLeft = active ? `${(active.x / w) * 100}%` : "50%";
  const tooltipTop = active ? `${(active.y / h) * 100}%` : "0%";

  return (
    <div
      style={{ position: "relative", height, touchAction: "none" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {active ? (
        <div
          style={{
            position: "absolute",
            left: tooltipLeft,
            top: tooltipTop,
            transform: "translate(-50%, calc(-100% - 12px))",
            zIndex: 3,
            background: "var(--ink)",
            color: "var(--bg-elev)",
            padding: "6px 10px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          }}
        >
          {active.label}: {fmtRD(active.value)}
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height, display: "block", pointerEvents: "none" }}
        role="img"
        aria-label="Gráfico de contribuciones"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={t.y}
              y2={t.y}
              stroke="var(--hairline)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={pad.l - 6}
              y={t.y + 3}
              fontSize="10"
              fill="var(--ink-3)"
              textAnchor="end"
              style={{ fontFamily: "inherit" }}
            >
              {fmtRDshort(t.v)}
            </text>
          </g>
        ))}

        {active ? (
          <line
            x1={active.x}
            x2={active.x}
            y1={pad.t}
            y2={pad.t + innerH}
            stroke="var(--primary)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.45"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {pts.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            {activeIndex === i ? (
              <circle cx={p.x} cy={p.y} r="8" fill="var(--accent)" opacity="0.22" />
            ) : null}
            <circle
              cx={p.x}
              cy={p.y}
              r={activeIndex === i ? 5 : 3.5}
              fill={activeIndex === i ? "var(--accent)" : "var(--primary)"}
              stroke="var(--surface)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={p.x}
              y={h - 10}
              fontSize="10"
              fill="var(--ink-3)"
              textAnchor="middle"
              fontWeight="600"
              style={{ fontFamily: "inherit" }}
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
