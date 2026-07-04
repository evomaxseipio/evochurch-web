"use client";

import {
  CHART_PERIODS,
  type DashboardChartPeriod,
} from "@/lib/dashboard/types";
import { useTranslations } from "next-intl";

export function ChartPeriodToolbar({
  value,
  onChange,
}: {
  value: DashboardChartPeriod;
  onChange: (period: DashboardChartPeriod) => void;
}) {
  const t = useTranslations("dashboard");

  return (
    <div className="row" style={{ gap: 6 }}>
      {CHART_PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          className={`btn ${value === period ? "outline" : "ghost"} sm`}
          onClick={() => onChange(period)}
        >
          {t(`period.${period}`)}
        </button>
      ))}
    </div>
  );
}
