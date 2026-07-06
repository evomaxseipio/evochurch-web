import type { DashboardChartPeriod } from "@/lib/dashboard/types";

type ChartLabelPoint = {
  label: string;
  from?: string;
};

export function localizeChartPointLabel(
  point: ChartLabelPoint,
  period: DashboardChartPeriod,
  monthShort: (monthIndex: number) => string,
): string {
  const from = point.from;
  if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return point.label;
  }

  const d = new Date(`${from}T12:00:00`);
  const month = monthShort(d.getMonth());

  switch (period) {
    case "week":
      return `${d.getDate()} ${month}`;
    case "month":
    case "year":
      return month;
    case "quarter": {
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return `Q${quarter} ${String(d.getFullYear()).slice(-2)}`;
    }
    default:
      return point.label;
  }
}
