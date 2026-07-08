export type DateRange = { from: string; to: string };

/** Primer día del año en curso → hoy (ISO date). */
export function defaultYearToDateRange(): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  return {
    from: `${year}-01-01`,
    to: now.toISOString().slice(0, 10),
  };
}

/** Últimos 7 días inclusive (hoy − 6 → hoy). */
export function defaultLastSevenDaysRange(): DateRange {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function isDateInRange(
  dateStr: string | null | undefined,
  range: DateRange,
): boolean {
  if (!dateStr) return false;
  const part = dateStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(part)) return false;
  return part >= range.from && part <= range.to;
}

export function dateRangeExportSlug(range: DateRange): string {
  return `${range.from}_${range.to}`;
}

const MS_PER_DAY = 86_400_000;

function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Periodo anterior de la misma duración (inmediatamente antes de `from`). */
export function getPreviousDateRange(range: DateRange): DateRange {
  const from = parseIsoDate(range.from);
  const to = parseIsoDate(range.to);
  const days = Math.max(
    1,
    Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY) + 1,
  );
  const prevTo = new Date(from.getTime() - MS_PER_DAY);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * MS_PER_DAY);
  return {
    from: prevFrom.toISOString().slice(0, 10),
    to: prevTo.toISOString().slice(0, 10),
  };
}
