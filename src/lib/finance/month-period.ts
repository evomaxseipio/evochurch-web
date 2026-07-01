export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const MONTH_NAMES_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

export type YearMonth = { year: number; month: number };

export function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function monthLabel({ year, month }: YearMonth): string {
  const name = MONTH_NAMES[month - 1] ?? String(month);
  return `${name} ${year}`;
}

export function monthExportSlug({ year, month }: YearMonth): string {
  const short = MONTH_NAMES_SHORT[month - 1] ?? String(month);
  return `${short}${year}`;
}

/** ISO date bounds inclusive for a calendar month (month 1–12). */
export function monthDateBounds({ year, month }: YearMonth): {
  from: string;
  to: string;
} {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function isDateInMonth(
  dateStr: string | null | undefined,
  period: YearMonth,
): boolean {
  if (!dateStr) return false;
  const part = dateStr.slice(0, 10);
  const { from, to } = monthDateBounds(period);
  return part >= from && part <= to;
}

export function shiftYearMonth(
  { year, month }: YearMonth,
  delta: number,
): YearMonth {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
