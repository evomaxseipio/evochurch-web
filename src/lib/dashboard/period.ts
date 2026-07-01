import { MONTH_NAMES_SHORT, monthDateBounds } from "@/lib/finance/month-period";
import type { DashboardChartPeriod, PeriodBucket } from "@/lib/dashboard/types";

const MS_PER_DAY = 86_400_000;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Lunes como inicio de semana. */
function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function quarterBounds(year: number, quarter: number): PeriodBucket {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const from = monthDateBounds({ year, month: startMonth }).from;
  const to = monthDateBounds({ year, month: endMonth }).to;
  return {
    key: `${year}-Q${quarter}`,
    label: `T${quarter} ${String(year).slice(-2)}`,
    from,
    to,
  };
}

function currentQuarter(anchor: Date): { year: number; quarter: number } {
  const month = anchor.getMonth() + 1;
  return {
    year: anchor.getFullYear(),
    quarter: Math.floor((month - 1) / 3) + 1,
  };
}

export function buildPeriodBuckets(
  period: DashboardChartPeriod,
  anchor = new Date(),
): PeriodBucket[] {
  switch (period) {
    case "week": {
      const thisWeekStart = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, index) => {
        const offset = 6 - index;
        const start = new Date(
          thisWeekStart.getTime() - offset * 7 * MS_PER_DAY,
        );
        const end = new Date(start.getTime() + 6 * MS_PER_DAY);
        return {
          key: isoDate(start),
          label: `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]}`,
          from: isoDate(start),
          to: isoDate(end),
        };
      });
    }
    case "month": {
      return Array.from({ length: 7 }, (_, index) => {
        const offset = 6 - index;
        const d = new Date(
          anchor.getFullYear(),
          anchor.getMonth() - offset,
          1,
        );
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const bounds = monthDateBounds({ year, month });
        return {
          key: `${year}-${String(month).padStart(2, "0")}`,
          label: MONTH_NAMES_SHORT[month - 1] ?? String(month),
          from: bounds.from,
          to: bounds.to,
        };
      });
    }
    case "quarter": {
      const { year, quarter } = currentQuarter(anchor);
      return Array.from({ length: 4 }, (_, index) => {
        const offset = 3 - index;
        let q = quarter - offset;
        let y = year;
        while (q < 1) {
          q += 4;
          y -= 1;
        }
        return quarterBounds(y, q);
      });
    }
    case "year": {
      const year = anchor.getFullYear();
      return Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const bounds = monthDateBounds({ year, month });
        return {
          key: `${year}-${String(month).padStart(2, "0")}`,
          label: MONTH_NAMES_SHORT[month - 1] ?? String(month),
          from: bounds.from,
          to: bounds.to,
        };
      });
    }
  }
}

export function isDateInBucket(dateStr: string, bucket: PeriodBucket): boolean {
  const part = dateStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(part)) return false;
  return part >= bucket.from && part <= bucket.to;
}

export function currentMonthBounds(anchor = new Date()): PeriodBucket {
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;
  const bounds = monthDateBounds({ year, month });
  return {
    key: `${year}-${String(month).padStart(2, "0")}`,
    label: MONTH_NAMES_SHORT[month - 1] ?? String(month),
    from: bounds.from,
    to: bounds.to,
  };
}

export function previousMonthBounds(anchor = new Date()): PeriodBucket {
  const d = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  return currentMonthBounds(d);
}

export function todayIso(anchor = new Date()): string {
  return isoDate(anchor);
}

export function formatHeroDateLabel(anchor = new Date()): string {
  const weekday = anchor.toLocaleDateString("es-DO", { weekday: "long" });
  const day = anchor.getDate();
  const month = anchor.toLocaleDateString("es-DO", { month: "long" });
  const year = anchor.getFullYear();
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${cap} · ${day} de ${month}, ${year}`;
}

export function daysSinceEpoch(anchor = new Date()): number {
  return Math.floor(parseIso(todayIso(anchor)).getTime() / MS_PER_DAY);
}
