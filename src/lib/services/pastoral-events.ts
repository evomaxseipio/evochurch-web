import {
  parsePastoralEventsResponse,
  type PastoralEvent,
  type PastoralEventInput,
} from "@/lib/members/pastoral-events";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchProfilePastoralEvents(
  supabase: SupabaseClient,
  churchId: number,
  profileId: string,
): Promise<PastoralEvent[]> {
  const { data, error } = await supabase.rpc("sp_list_profile_pastoral_events", {
    p_profile_id: profileId,
    p_church_id: churchId,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudieron cargar los eventos pastorales.");
  return parsePastoralEventsResponse(data);
}

export async function maintainProfilePastoralEvent(
  supabase: SupabaseClient,
  churchId: number,
  input: PastoralEventInput,
  action: "insert" | "update" | "delete",
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_maintain_profile_pastoral_event", {
    p_profile_id: input.profileId,
    p_church_id: churchId,
    p_action: action,
    p_event_id: input.eventId ?? null,
    p_event_type: action === "delete" ? null : input.eventType,
    p_title: action === "delete" ? null : input.title || null,
    p_description: action === "delete" ? null : input.description || null,
    p_event_date: action === "delete" ? null : input.eventDate || null,
    p_needs_follow_up: action === "delete" ? false : input.needsFollowUp,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo guardar el evento pastoral.");
}
