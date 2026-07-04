import {
  MONTH_NAMES,
  monthDateBounds,
  monthLabel,
  shiftYearMonth,
} from "@/lib/finance/month-period";
import type { ReportPeriod } from "@/lib/reports/types";

export type MonthPeriod = Extract<ReportPeriod, { kind: "month" }>;
export type YearPeriod = Extract<ReportPeriod, { kind: "year" }>;

export function monthBounds(period: MonthPeriod): { from: string; to: string } {
  return monthDateBounds({ year: period.year, month: period.month });
}

export function yearBounds(period: YearPeriod): { from: string; to: string } {
  return {
    from: `${period.year}-01-01`,
    to: `${period.year}-12-31`,
  };
}

/** Período por defecto del producto: mes calendario anterior. */
export function previousCalendarMonth(anchor = new Date()): MonthPeriod {
  const current = {
    year: anchor.getFullYear(),
    month: anchor.getMonth() + 1,
  };
  const prev = shiftYearMonth(current, -1);
  return { kind: "month", year: prev.year, month: prev.month };
}

export function defaultReportPeriod(
  kind: ReportPeriod["kind"],
  anchor = new Date(),
): ReportPeriod {
  if (kind === "year") {
    return { kind: "year", year: anchor.getFullYear() };
  }
  return previousCalendarMonth(anchor);
}

export function formatReportPeriodLabel(period: ReportPeriod): string {
  if (period.kind === "month") {
    return monthLabel({ year: period.year, month: period.month });
  }
  return String(period.year);
}

/** Serializa/deserializa período desde query string (`2026-03` o `2026`). */
export function parsePeriodParam(
  raw: string | null | undefined,
  kind: ReportPeriod["kind"],
): ReportPeriod | null {
  const value = raw?.trim();
  if (!value) return null;

  if (kind === "year") {
    const year = Number.parseInt(value, 10);
    if (!Number.isFinite(year) || year < 2000 || year > 2100) return null;
    return { kind: "year", year };
  }

  const match = /^(\d{4})-(\d{1,2})$/.exec(value);
  if (!match) return null;
  const year = Number.parseInt(match[1]!, 10);
  const month = Number.parseInt(match[2]!, 10);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { kind: "month", year, month };
}

export function serializePeriodParam(period: ReportPeriod): string {
  if (period.kind === "year") return String(period.year);
  return `${period.year}-${String(period.month).padStart(2, "0")}`;
}

export function periodSlug(period: ReportPeriod): string {
  if (period.kind === "year") return String(period.year);
  return `${period.year}-${String(period.month).padStart(2, "0")}`;
}

export function monthPeriodFromParts(year: number, month: number): MonthPeriod {
  return { kind: "month", year, month };
}

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}
