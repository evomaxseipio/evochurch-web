"use server";
import { churchPath } from "@/lib/apps/church-routes";

import { getActionSession } from "@/lib/auth/app-session";
import {
  canCreateEventWith,
  canDeleteEventsWith,
  canEditEventWith,
  canFeatureEventsWith,
  canWriteEventsWith,
  hasPermission,
} from "@/lib/auth/permissions";
import { revalidateEventsCatalog } from "@/lib/cache/catalog-tags";
import { buildWeeklyRecurrenceRule } from "@/lib/events/parse";
import type { EventFormInput, EventSeries, EventType } from "@/lib/events/types";
import { EVENT_TYPES } from "@/lib/events/types";
import { fetchMinistries } from "@/lib/services/ministries";
import {
  deleteEvent,
  fetchEventSeries,
  saveEvent,
} from "@/lib/services/events";
import { revalidatePath } from "next/cache";

export type EventActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function sessionContext() {
  const { supabase, session } = await getActionSession();
  return { supabase, churchId: session.churchId, session };
}

async function churchTimezone(
  supabase: Awaited<ReturnType<typeof sessionContext>>["supabase"],
  churchId: number,
): Promise<string> {
  const { data } = await supabase
    .from("church")
    .select("timezone")
    .eq("id", churchId)
    .maybeSingle();
  const tz = data?.timezone;
  return typeof tz === "string" && tz.trim() ? tz : "America/Santo_Domingo";
}

function parseEventType(value: FormDataEntryValue | null): EventType {
  const raw = String(value ?? "").toLowerCase();
  return (EVENT_TYPES as readonly string[]).includes(raw)
    ? (raw as EventType)
    : "evento";
}

function parseFormInput(formData: FormData): EventFormInput {
  const isAllDay = formData.get("isAllDay") === "on";
  const isFeatured = formData.get("isFeatured") === "on";
  const isWebsiteListed = formData.get("isWebsiteListed") === "on";
  const isWebsitePromoted = formData.get("isWebsitePromoted") === "on";
  const isRecurring = formData.get("isRecurring") === "on";
  const localStartDate = String(formData.get("localStartDate") ?? "").trim();
  const recurrenceUntil = String(formData.get("recurrenceUntil") ?? "").trim();

  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    eventType: parseEventType(formData.get("eventType")),
    ministryId: String(formData.get("ministryId") ?? "").trim() || null,
    fundId: String(formData.get("fundId") ?? "").trim() || null,
    localStartDate,
    localStartTime: String(formData.get("localStartTime") ?? "").trim(),
    localEndTime: String(formData.get("localEndTime") ?? "").trim(),
    isAllDay,
    isFeatured,
    isWebsiteListed,
    isWebsitePromoted,
    isRecurring,
    recurrenceRule:
      isRecurring && localStartDate
        ? buildWeeklyRecurrenceRule(localStartDate)
        : null,
    recurrenceUntil: recurrenceUntil || null,
  };
}

function validateInput(
  input: EventFormInput,
  session: Awaited<ReturnType<typeof sessionContext>>["session"],
): string | null {
  if (!input.title) return "titleRequired";
  if (!input.localStartDate) return "dateRequired";
  if (!input.isAllDay && !input.localStartTime) return "timeRequired";

  const writeOwnOnly =
    !hasPermission(session, "eventos:write") &&
    hasPermission(session, "eventos:write_own");

  if (writeOwnOnly && !input.ministryId) {
    return "ministryRequired";
  }

  if (
    (input.isFeatured || input.isWebsiteListed || input.isWebsitePromoted) &&
    !canFeatureEventsWith(session.permissions)
  ) {
    return "Acceso denegado.";
  }

  return null;
}

export async function saveEventAction(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  try {
    const { supabase, churchId, session } = await sessionContext();
    if (!canCreateEventWith(session.permissions)) {
      return { ok: false, error: "Acceso denegado." };
    }

    const input = parseFormInput(formData);
    const validation = validateInput(input, session);
    if (validation?.startsWith("Acceso")) {
      return { ok: false, error: validation };
    }
    if (validation) {
      return { ok: false, error: validation };
    }

    const eventId = String(formData.get("eventId") ?? "").trim() || null;
    if (eventId && !canWriteEventsWith(session.permissions)) {
      return { ok: false, error: "Acceso denegado." };
    }

    await saveEvent(supabase, churchId, session.profileId, {
      ...input,
      id: eventId,
    });

    revalidateEventsCatalog(churchId);
    revalidatePath(churchPath("/eventos"));
    revalidatePath(churchPath("/dashboard"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al guardar.",
    };
  }
}

export async function loadEventSeriesAction(
  seriesId: string,
): Promise<{ ok: true; series: EventSeries } | { ok: false; error: string }> {
  try {
    const { supabase, churchId, session } = await sessionContext();
    const timezone = await churchTimezone(supabase, churchId);
    const series = await fetchEventSeries(
      supabase,
      churchId,
      seriesId,
      timezone,
    );
    if (!series) return { ok: false, error: "Evento no encontrado." };

    const ministries = await fetchMinistries(supabase, churchId);
    const ministry = ministries.find((m) => m.id === series.ministryId);
    if (
      !canEditEventWith(
        session.permissions,
        session.profileId,
        series.ministryId,
        ministry?.leaderProfileIds ?? [],
      )
    ) {
      return { ok: false, error: "Acceso denegado." };
    }

    return { ok: true, series };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al cargar.",
    };
  }
}

export async function deleteEventAction(
  eventId: string,
): Promise<EventActionResult> {
  try {
    const { supabase, churchId, session } = await sessionContext();
    if (!canDeleteEventsWith(session.permissions)) {
      return { ok: false, error: "Acceso denegado." };
    }

    await deleteEvent(supabase, churchId, eventId);
    revalidateEventsCatalog(churchId);
    revalidatePath(churchPath("/eventos"));
    revalidatePath(churchPath("/dashboard"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al eliminar.",
    };
  }
}
