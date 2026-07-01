import type { MonthPoint } from "@/lib/mock/dashboard-data";
import { fmtRDshort } from "@/lib/format-currency";

export function GivingLineChart({
  data,
  height = 180,
}: {
  data: MonthPoint[];
  height?: number;
}) {
  const w = 600;
  const h = height;
  const max = Math.max(...data.map((d) => d.v));
  const min = 0;
  const pad = { l: 50, r: 16, t: 20, b: 30 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const pts = data.map((d, i) => {
    const x = pad.l + (i * innerW) / (data.length - 1 || 1);
    const y = pad.t + innerH - ((d.v - min) / (max - min || 1)) * innerH;
    return { x, y, ...d };
  });

  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${pad.t + innerH} L ${pts[0].x} ${pad.t + innerH} Z`;
  const ticks = [0, 0.5, 1].map((t) => ({
    y: pad.t + innerH - t * innerH,
    v: max * t,
  }));
  const lastIdx = pts.length - 1;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Gráfico de ofrendas mensuales"
    >
      <defs>
        <linearGradient id="giving-fill" x1="0" x2="0" y1="0" y2="1">
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
            strokeDasharray="3 3"
          />
          <text
            x={pad.l - 8}
            y={t.y + 4}
            fontSize="10"
            fill="var(--ink-4)"
            textAnchor="end"
          >
            {fmtRDshort(t.v)}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#giving-fill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <g key={p.m}>
          {i === lastIdx ? (
            <circle cx={p.x} cy={p.y} r="8" fill="var(--accent)" opacity="0.2" />
          ) : null}
          <circle
            cx={p.x}
            cy={p.y}
            r={i === lastIdx ? 5 : 3}
            fill={i === lastIdx ? "var(--accent)" : "var(--primary)"}
            stroke="var(--surface)"
            strokeWidth="2"
          />
          <text
            x={p.x}
            y={h - 8}
            fontSize="11"
            fill="var(--ink-3)"
            textAnchor="middle"
            fontWeight="600"
          >
            {p.m}
          </text>
        </g>
      ))}
    </svg>
  );
}
