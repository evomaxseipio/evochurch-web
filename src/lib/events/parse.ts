import type {
  EventOccurrence,
  EventSeries,
  EventType,
  EventsPayload,
  RecurrenceRule,
} from "@/lib/events/types";
import { EVENT_TYPES } from "@/lib/events/types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function parseEventType(v: unknown): EventType {
  const s = asString(v).toLowerCase();
  return (EVENT_TYPES as readonly string[]).includes(s)
    ? (s as EventType)
    : "evento";
}

function parseRecurrenceRule(raw: unknown): RecurrenceRule | null {
  const row = asRecord(raw);
  if (!row) return null;
  const frequency = asString(row.frequency);
  if (frequency !== "weekly" && frequency !== "monthly") return null;
  const byWeekday = Array.isArray(row.byWeekday)
    ? row.byWeekday
        .map((d) => Number(d))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    : [];
  const interval = Math.max(1, Number(row.interval) || 1);
  const exceptions = Array.isArray(row.exceptions)
    ? row.exceptions.map((d) => asString(d)).filter(Boolean)
    : undefined;
  return {
    frequency,
    interval,
    byWeekday,
    exceptions,
  };
}

export function parseEventOccurrenceRow(raw: unknown): EventOccurrence | null {
  const row = asRecord(raw);
  if (!row) return null;
  const seriesId = asString(row.series_id ?? row.seriesId);
  if (!seriesId) return null;
  return {
    seriesId,
    occurrenceDate: asString(row.occurrence_date ?? row.occurrenceDate),
    title: asString(row.title),
    description: asString(row.description) || null,
    location: asString(row.location) || null,
    eventType: parseEventType(row.event_type ?? row.eventType),
    ministryId: asString(row.ministry_id ?? row.ministryId) || null,
    ministryName: asString(row.ministry_name ?? row.ministryName) || null,
    fundId: asString(row.fund_id ?? row.fundId) || null,
    startsAt: asString(row.starts_at ?? row.startsAt),
    endsAt: asString(row.ends_at ?? row.endsAt) || null,
    isAllDay: asBool(row.is_all_day ?? row.isAllDay),
    isFeatured: asBool(row.is_featured ?? row.isFeatured),
    isWebsiteListed: asBool(row.is_website_listed ?? row.isWebsiteListed),
    isWebsitePromoted: asBool(row.is_website_promoted ?? row.isWebsitePromoted),
    isRecurring: asBool(row.is_recurring ?? row.isRecurring),
  };
}

export function parseEventsResponse(raw: unknown): EventsPayload {
  const root = asRecord(raw) ?? {};
  const eventsRaw = root.events;
  const events = Array.isArray(eventsRaw)
    ? eventsRaw
        .map(parseEventOccurrenceRow)
        .filter((e): e is EventOccurrence => e != null)
    : [];
  return {
    timezone: asString(root.timezone) || "America/Santo_Domingo",
    events,
  };
}

export function formatEventLocalTime(
  startsAtIso: string,
  timezone: string,
  isAllDay: boolean,
  locale: string,
): string {
  if (!startsAtIso) return "";
  const date = new Date(startsAtIso);
  if (Number.isNaN(date.getTime())) return "";
  if (isAllDay) return "";
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

export function formatEventLocalDate(
  startsAtIso: string,
  timezone: string,
  locale: string,
  style: "short" | "long" = "short",
): string {
  if (!startsAtIso) return "";
  const date = new Date(startsAtIso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    weekday: style === "long" ? "long" : undefined,
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: style === "long" ? "numeric" : undefined,
    timeZone: timezone,
  }).format(date);
}

export function formatEventMonthDay(
  startsAtIso: string,
  timezone: string,
  locale: string,
): { month: string; day: string } {
  const date = new Date(startsAtIso);
  const month = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: timezone,
  })
    .format(date)
    .toUpperCase();
  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone: timezone,
  }).format(date);
  return { month, day };
}

export function eventTypeAccent(type: EventType): string {
  switch (type) {
    case "culto":
      return "var(--accent)";
    case "estudio":
      return "var(--lila)";
    default:
      return "var(--success)";
  }
}

export function occurrenceToSeriesForm(
  event: EventOccurrence,
  timezone: string,
): EventSeries {
  const date = new Date(event.startsAt);
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const localTime = event.isAllDay
    ? "00:00"
    : new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
  return {
    id: event.seriesId,
    title: event.title,
    description: event.description,
    location: event.location,
    eventType: event.eventType,
    ministryId: event.ministryId,
    ministryName: event.ministryName,
    fundId: event.fundId,
    localStartDate: localDate,
    localStartTime: localTime,
    localEndTime: "",
    isAllDay: event.isAllDay,
    isFeatured: event.isFeatured,
    isWebsiteListed: event.isWebsiteListed,
    isWebsitePromoted: event.isWebsitePromoted,
    isRecurring: event.isRecurring,
    recurrenceRule: null,
    recurrenceUntil: null,
  };
}

export function weekdayFromLocalDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function buildWeeklyRecurrenceRule(
  localStartDate: string,
): RecurrenceRule {
  return {
    frequency: "weekly",
    interval: 1,
    byWeekday: [weekdayFromLocalDate(localStartDate)],
    exceptions: [],
  };
}
