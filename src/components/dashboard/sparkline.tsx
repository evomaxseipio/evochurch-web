export function Sparkline({
  data,
  color = "var(--primary)",
}: {
  data: number[];
  color?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 200;
  const h = 50;
  const pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1 || 1);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return [x, y];
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const dFill = `${d} L ${w - pad} ${h} L ${pad} ${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden
    >
      <path d={dFill} fill={color} opacity={0.12} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
