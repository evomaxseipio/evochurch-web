/** Sunday–Sunday week bounds (inclusive). `date` uses local calendar day. */
export function sundayWeekBounds(date: Date): {
  periodStart: string;
  periodEnd: string;
} {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    periodStart: toIsoDate(start),
    periodEnd: toIsoDate(end),
  };
}

export function shiftSundayWeek(
  periodStartIso: string,
  weeks: number,
): { periodStart: string; periodEnd: string } {
  const start = parseIsoDate(periodStartIso);
  start.setDate(start.getDate() + weeks * 7);
  return sundayWeekBounds(start);
}

export function formatWeekLabel(
  periodStart: string,
  periodEnd: string,
  locale: string,
): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(parseIsoDate(periodStart))} – ${fmt.format(parseIsoDate(periodEnd))}`;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function currentSundayWeek(): { periodStart: string; periodEnd: string } {
  return sundayWeekBounds(new Date());
}
