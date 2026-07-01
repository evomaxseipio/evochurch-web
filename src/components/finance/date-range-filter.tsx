"use client";

import {
  defaultYearToDateRange,
  type DateRange,
} from "@/lib/finance/date-range";

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
}) {
  const defaults = defaultYearToDateRange();
  const isDefault = value.from === defaults.from && value.to === defaults.to;

  return (
    <div
      className="row"
      style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}
    >
      <label className="row" style={{ gap: 6, alignItems: "center" }}>
        <span className="tiny muted" style={{ fontWeight: 600 }}>
          Desde
        </span>
        <input
          type="date"
          className="input"
          style={{ width: 148, minWidth: 148 }}
          value={value.from}
          max={value.to}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          aria-label="Fecha desde"
        />
      </label>
      <label className="row" style={{ gap: 6, alignItems: "center" }}>
        <span className="tiny muted" style={{ fontWeight: 600 }}>
          Hasta
        </span>
        <input
          type="date"
          className="input"
          style={{ width: 148, minWidth: 148 }}
          value={value.to}
          min={value.from}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          aria-label="Fecha hasta"
        />
      </label>
      {!isDefault ? (
        <button
          type="button"
          className="btn outline sm"
          onClick={() => onChange(defaultYearToDateRange())}
        >
          Restablecer
        </button>
      ) : null}
    </div>
  );
}

export { dateRangeExportSlug } from "@/lib/finance/date-range";
