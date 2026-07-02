"use client";

import {
  CHART_PERIOD_LABELS,
  CHART_PERIODS,
  type DashboardChartPeriod,
} from "@/lib/dashboard/types";

export function ChartPeriodToolbar({
  value,
  onChange,
}: {
  value: DashboardChartPeriod;
  onChange: (period: DashboardChartPeriod) => void;
}) {
  return (
    <div className="row" style={{ gap: 6 }}>
      {CHART_PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          className={`btn ${value === period ? "outline" : "ghost"} sm`}
          onClick={() => onChange(period)}
        >
          {CHART_PERIOD_LABELS[period]}
        </button>
      ))}
    </div>
  );
}
