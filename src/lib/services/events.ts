import { catalogTags } from "@/lib/cache/catalog-tags";
import { parseEventsResponse } from "@/lib/events/parse";
import type {
  EventFormInput,
  EventSeries,
  EventsPayload,
  RecurrenceRule,
} from "@/lib/events/types";
import { EVENT_TYPES } from "@/lib/events/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

function rpcMessage(raw: unknown): string {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  return typeof row?.message === "string" ? row.message : "Error al procesar evento.";
}

function assertRpcSuccess(raw: unknown): void {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (row?.success !== true) {
    throw new Error(rpcMessage(raw));
  }
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const to = new Date(today.getFullYear() + 1, 11, 31);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

export async function fetchEvents(
  supabase: SupabaseClient,
  churchId: number,
  options?: {
    from?: string;
    to?: string;
    ministryId?: string | null;
  },
): Promise<EventsPayload> {
  const range = defaultRange();
  const from = options?.from ?? range.from;
  const to = options?.to ?? range.to;
  const ministryId = options?.ministryId ?? null;
  return unstable_cache(
    async () => {
      const { data, error } = await supabase.rpc("sp_get_events", {
        p_church_id: churchId,
        p_from: from,
        p_to: to,
        p_ministry_id: ministryId ?? null,
      });
      if (error) throw error;
      const parsed = parseEventsResponse(data);
      if (data && typeof data === "object" && (data as { success?: boolean }).success === false) {
        throw new Error(rpcMessage(data));
      }
      return parsed;
    },
    ["catalog:events", "v1", String(churchId), from, to, ministryId ?? "all"],
    { tags: [catalogTags.events(churchId)], revalidate: 120 },
  )();
}

export async function saveEvent(
  supabase: SupabaseClient,
  churchId: number,
  profileId: string,
  input: EventFormInput & { id?: string | null },
): Promise<string> {
  const recurrenceRule =
    input.isRecurring && input.recurrenceRule
      ? input.recurrenceRule
      : null;

  const { data, error } = await supabase.rpc("sp_maintain_event", {
    p_event_id: input.id ?? null,
    p_church_id: churchId,
    p_title: input.title.trim(),
    p_description: input.description.trim() || null,
    p_location: input.location.trim() || null,
    p_event_type: input.eventType,
    p_ministry_id: input.ministryId || null,
    p_fund_id: input.fundId || null,
    p_local_start_date: input.localStartDate,
    p_local_start_time: input.isAllDay ? "00:00" : input.localStartTime || "00:00",
    p_local_end_time: input.localEndTime || null,
    p_is_all_day: input.isAllDay,
    p_is_featured: input.isFeatured,
    p_is_website_listed: input.isWebsiteListed,
    p_is_website_promoted: input.isWebsitePromoted,
    p_is_recurring: input.isRecurring,
    p_recurrence_rule: recurrenceRule,
    p_recurrence_until: input.recurrenceUntil || null,
    p_created_by_profile_id: profileId,
  });

  if (error) throw error;
  assertRpcSuccess(data);
  const eventId =
    data && typeof data === "object"
      ? String((data as { event_id?: string }).event_id ?? input.id ?? "")
      : "";
  return eventId;
}

function parseRecurrenceRule(raw: unknown): RecurrenceRule | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const frequency = String(row.frequency ?? "");
  if (frequency !== "weekly" && frequency !== "monthly") return null;
  return {
    frequency,
    interval: Math.max(1, Number(row.interval) || 1),
    byWeekday: Array.isArray(row.byWeekday)
      ? row.byWeekday.map((d) => Number(d)).filter((n) => n >= 0 && n <= 6)
      : [],
    exceptions: Array.isArray(row.exceptions)
      ? row.exceptions.map(String)
      : [],
  };
}

export async function fetchEventSeries(
  supabase: SupabaseClient,
  churchId: number,
  seriesId: string,
  timezone: string,
): Promise<EventSeries | null> {
  const { data, error } = await supabase
    .from("church_events")
    .select(
      "id, title, description, location, event_type, ministry_id, fund_id, starts_at, ends_at, is_all_day, is_featured, is_website_listed, is_website_promoted, is_recurring, recurrence_rule, recurrence_until, church_ministries(name)",
    )
    .eq("church_id", churchId)
    .eq("id", seriesId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const ministryJoin = row.church_ministries as { name?: string } | null;
  const startsAt = String(row.starts_at ?? "");
  const date = new Date(startsAt);
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const isAllDay = Boolean(row.is_all_day);
  const localTime = isAllDay
    ? "00:00"
    : new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
  let localEndTime = "";
  if (row.ends_at) {
    localEndTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(String(row.ends_at)));
  }

  const eventType = String(row.event_type ?? "evento");
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: (row.description as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    eventType: (EVENT_TYPES as readonly string[]).includes(eventType)
      ? (eventType as EventSeries["eventType"])
      : "evento",
    ministryId: (row.ministry_id as string | null) ?? null,
    ministryName: ministryJoin?.name ?? null,
    fundId: (row.fund_id as string | null) ?? null,
    localStartDate: localDate,
    localStartTime: localTime,
    localEndTime,
    isAllDay,
    isFeatured: Boolean(row.is_featured),
    isWebsiteListed: Boolean(row.is_website_listed),
    isWebsitePromoted: Boolean(row.is_website_promoted),
    isRecurring: Boolean(row.is_recurring),
    recurrenceRule: parseRecurrenceRule(row.recurrence_rule),
    recurrenceUntil: (row.recurrence_until as string | null) ?? null,
  };
}

export async function deleteEvent(
  supabase: SupabaseClient,
  churchId: number,
  eventId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_delete_event", {
    p_event_id: eventId,
    p_church_id: churchId,
  });
  if (error) throw error;
  assertRpcSuccess(data);
}
