/** Escala Y legible para gráficos del dashboard. */
export function niceChartMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const magnitude = 10 ** exp;
  const normalized = value / magnitude;
  let nice: number;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

export function buildYAxisTicks(maxValue: number, count = 3): number[] {
  const max = niceChartMax(maxValue);
  if (count <= 1) return [max];
  return Array.from({ length: count }, (_, i) => (max * i) / (count - 1));
}
