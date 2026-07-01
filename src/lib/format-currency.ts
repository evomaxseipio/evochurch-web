export function fmtRD(n: number): string {
  return (
    "RD$ " +
    Math.abs(n).toLocaleString("es-DO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

export function fmtRDshort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `RD$ ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `RD$ ${(n / 1_000).toFixed(1)}K`;
  return `RD$ ${n.toFixed(0)}`;
}
