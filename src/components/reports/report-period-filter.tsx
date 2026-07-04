"use client";

import type { MonthPeriod, YearPeriod } from "@/lib/reports/period";
import { useTranslations } from "next-intl";

export function ReportPeriodFilter({
  monthPeriod,
  onMonthChange,
  yearPeriod,
  onYearChange,
}: {
  monthPeriod: MonthPeriod;
  onMonthChange: (next: MonthPeriod) => void;
  yearPeriod: YearPeriod;
  onYearChange: (next: YearPeriod) => void;
}) {
  const tReports = useTranslations("reports");
  const monthValue = `${monthPeriod.year}-${String(monthPeriod.month).padStart(2, "0")}`;

  return (
    <div
      className="row"
      style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}
    >
      <label className="row" style={{ gap: 6, alignItems: "center" }}>
        <span className="tiny muted" style={{ fontWeight: 600 }}>
          {tReports("month")}
        </span>
        <input
          type="month"
          className="input"
          style={{ width: 148, minWidth: 148 }}
          value={monthValue}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-").map(Number);
            if (y && m) onMonthChange({ kind: "month", year: y, month: m });
          }}
          aria-label={tReports("monthAria")}
        />
      </label>
      <label className="row" style={{ gap: 6, alignItems: "center" }}>
        <span className="tiny muted" style={{ fontWeight: 600 }}>
          {tReports("year")}
        </span>
        <input
          type="number"
          className="input"
          style={{ width: 88, minWidth: 88 }}
          value={yearPeriod.year}
          min={2000}
          max={2100}
          onChange={(e) => {
            const year = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(year)) onYearChange({ kind: "year", year });
          }}
          aria-label={tReports("yearAria")}
        />
      </label>
    </div>
  );
}
