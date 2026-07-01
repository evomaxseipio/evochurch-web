import { fmtRDshort } from "@/lib/format-currency";
import type { FundDistributionSlice } from "@/lib/contributions/types";

/** Donut del mockup `screens-3.jsx` — tab Contribuciones */
export function ContributionsDonutChart({
  slices,
  total,
}: {
  slices: FundDistributionSlice[];
  total: number;
}) {
  const r = 70;
  const R = 90;
  let angle = -Math.PI / 2;

  const arcs = slices.map((slice, i) => {
    const sweep = total ? (slice.amount / total) * Math.PI * 2 : 0;
    const a0 = angle;
    const a1 = angle + sweep;
    angle = a1;
    const large = sweep > Math.PI ? 1 : 0;
    const x0 = 100 + R * Math.cos(a0);
    const y0 = 100 + R * Math.sin(a0);
    const x1 = 100 + R * Math.cos(a1);
    const y1 = 100 + R * Math.sin(a1);
    const x0i = 100 + r * Math.cos(a0);
    const y0i = 100 + r * Math.sin(a0);
    const x1i = 100 + r * Math.cos(a1);
    const y1i = 100 + r * Math.sin(a1);

    return (
      <path
        key={slice.fundId || i}
        d={`M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x1i} ${y1i} A ${r} ${r} 0 ${large} 0 ${x0i} ${y0i} Z`}
        fill={slice.color}
      />
    );
  });

  return (
    <svg
      viewBox="0 0 200 200"
      style={{ width: 200, height: 200, margin: "0 auto", display: "block" }}
      aria-hidden
    >
      {arcs}
      <text
        x="100"
        y="92"
        textAnchor="middle"
        fontSize="11"
        fill="var(--ink-3)"
        fontWeight="600"
        letterSpacing="0.1em"
      >
        TOTAL
      </text>
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fontSize="22"
        fontFamily="var(--font-display)"
        fill="var(--ink)"
      >
        {fmtRDshort(total)}
      </text>
    </svg>
  );
}
