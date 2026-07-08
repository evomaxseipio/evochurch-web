"use client";

import {
  defaultYearToDateRange,
  type DateRange,
} from "@/lib/finance/date-range";
import { useTranslations } from "next-intl";

export function DateRangeFilter({
  value,
  onChange,
  defaultRange,
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
  defaultRange?: DateRange;
}) {
  const t = useTranslations("finances");
  const defaults = defaultRange ?? defaultYearToDateRange();
  const isDefault = value.from === defaults.from && value.to === defaults.to;

  return (
    <div
      className="row"
      style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}
    >
      <label className="row" style={{ gap: 6, alignItems: "center" }}>
        <span className="tiny muted" style={{ fontWeight: 600 }}>
          {t("from")}
        </span>
        <input
          type="date"
          className="input"
          style={{ width: 148, minWidth: 148 }}
          value={value.from}
          max={value.to}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          aria-label={t("fromDate")}
        />
      </label>
      <label className="row" style={{ gap: 6, alignItems: "center" }}>
        <span className="tiny muted" style={{ fontWeight: 600 }}>
          {t("to")}
        </span>
        <input
          type="date"
          className="input"
          style={{ width: 148, minWidth: 148 }}
          value={value.to}
          min={value.from}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          aria-label={t("toDate")}
        />
      </label>
      {!isDefault ? (
        <button
          type="button"
          className="btn outline sm"
          onClick={() => onChange(defaults)}
        >
          {t("resetDateRange")}
        </button>
      ) : null}
    </div>
  );
}

export { dateRangeExportSlug } from "@/lib/finance/date-range";
