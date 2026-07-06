import type { EventOccurrence } from "@/lib/events/types";

export type CalendarCell = {
  dateIso: string;
  day: number;
  muted: boolean;
  isToday: boolean;
};

export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function padIsoDate(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function buildMonthGrid(
  year: number,
  monthIndex: number,
  timezone: string,
): CalendarCell[] {
  const today = todayInTimezone(timezone);
  const first = new Date(year, monthIndex, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, monthIndex, -startDow + i + 1);
    const dateIso = padIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
    cells.push({
      dateIso,
      day: d.getDate(),
      muted: true,
      isToday: dateIso === today,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateIso = padIsoDate(year, monthIndex, day);
    cells.push({
      dateIso,
      day,
      muted: false,
      isToday: dateIso === today,
    });
  }

  while (cells.length % 7 !== 0) {
    const tail = cells.length - startDow - daysInMonth + 1;
    const d = new Date(year, monthIndex + 1, tail);
    const dateIso = padIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
    cells.push({
      dateIso,
      day: d.getDate(),
      muted: true,
      isToday: dateIso === today,
    });
  }

  return cells;
}

export function groupEventsByDate(
  events: EventOccurrence[],
): Map<string, EventOccurrence[]> {
  const map = new Map<string, EventOccurrence[]>();
  for (const event of events) {
    const key = event.occurrenceDate;
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  return map;
}

export function monthStartFromToday(timezone: string): { year: number; monthIndex: number } {
  const today = todayInTimezone(timezone);
  const [y, m] = today.split("-").map(Number);
  return { year: y, monthIndex: m - 1 };
}
