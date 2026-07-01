"use client";

import {
  MONTH_NAMES,
  monthLabel,
  shiftYearMonth,
  type YearMonth,
} from "@/lib/finance/month-period";

export function MonthPeriodFilter({
  value,
  onChange,
}: {
  value: YearMonth | null;
  onChange: (next: YearMonth | null) => void;
}) {
  const anchorYear = value?.year ?? new Date().getFullYear();

  return (
    <div
      className="row"
      style={{ gap: 6, flexWrap: "nowrap", alignItems: "center" }}
    >
      {value ? (
        <>
          <button
            type="button"
            className="btn outline sm icon-only"
            onClick={() => onChange(shiftYearMonth(value, -1))}
            aria-label="Mes anterior"
            style={{ fontSize: 18, lineHeight: 1 }}
          >
            ‹
          </button>
        </>
      ) : null}
      <div
        className="input-wrap"
        style={{ minWidth: 168, flex: "1 1 auto", maxWidth: 200 }}
      >
        <select
          value={value ? `${value.year}-${value.month}` : ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (!raw) {
              onChange(null);
              return;
            }
            const [y, m] = raw.split("-").map(Number);
            if (y && m) onChange({ year: y, month: m });
          }}
          aria-label="Filtrar por mes"
        >
          <option value="">Todos los meses</option>
          {buildMonthOptions(anchorYear).map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {value ? (
        <>
          <button
            type="button"
            className="btn outline sm icon-only"
            onClick={() => onChange(shiftYearMonth(value, 1))}
            aria-label="Mes siguiente"
            style={{ fontSize: 18, lineHeight: 1 }}
          >
            ›
          </button>
          <button
            type="button"
            className="btn outline sm"
            onClick={() => onChange(null)}
          >
            Quitar
          </button>
        </>
      ) : null}
    </div>
  );
}

function buildMonthOptions(anchorYear: number) {
  const options: { key: string; label: string }[] = [];
  for (let y = anchorYear - 2; y <= anchorYear + 1; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      options.push({
        key: `${y}-${m}`,
        label: monthLabel({ year: y, month: m }),
      });
    }
  }
  return options;
}

export function monthPeriodExportLabel(period: YearMonth | null): string {
  if (!period) return "Completo";
  const short = MONTH_NAMES[period.month - 1]?.slice(0, 3) ?? "";
  return `${short}${period.year}`;
}
