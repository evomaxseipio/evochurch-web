export const PASTORAL_EVENT_TYPES = [
  "illness",
  "accident",
  "family_loss",
  "financial_aid",
  "emergency",
  "collection",
  "recognition",
  "discipleship",
  "other",
] as const;

export type PastoralEventType = (typeof PASTORAL_EVENT_TYPES)[number];

export type PastoralEvent = {
  id: string;
  profileId: string;
  churchId: number;
  eventType: PastoralEventType;
  title: string;
  description: string;
  eventDate: string;
  needsFollowUp: boolean;
  createdByProfileId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PastoralEventInput = {
  profileId: string;
  eventId?: string;
  eventType: PastoralEventType;
  title: string;
  description: string;
  eventDate: string;
  needsFollowUp: boolean;
};

export function isPastoralEventType(value: string): value is PastoralEventType {
  return (PASTORAL_EVENT_TYPES as readonly string[]).includes(value);
}

export function parsePastoralEvent(raw: unknown): PastoralEvent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const eventType = String(row.eventType ?? row.event_type ?? "").trim();
  if (!isPastoralEventType(eventType)) return null;

  const id = String(row.id ?? "").trim();
  const profileId = String(row.profileId ?? row.profile_id ?? "").trim();
  if (!id || !profileId) return null;

  return {
    id,
    profileId,
    churchId: Number(row.churchId ?? row.church_id ?? 0),
    eventType,
    title: String(row.title ?? "").trim(),
    description: String(row.description ?? "").trim(),
    eventDate: String(row.eventDate ?? row.event_date ?? "").slice(0, 10),
    needsFollowUp:
      row.needsFollowUp === true ||
      row.needs_follow_up === true ||
      row.needsFollowUp === "true",
    createdByProfileId:
      row.createdByProfileId != null
        ? String(row.createdByProfileId)
        : row.created_by_profile_id != null
          ? String(row.created_by_profile_id)
          : null,
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ""),
  };
}

export function parsePastoralEventsResponse(data: unknown): PastoralEvent[] {
  const root =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  const events = root?.events ?? data;
  if (!Array.isArray(events)) return [];
  return events
    .map(parsePastoralEvent)
    .filter((event): event is PastoralEvent => event != null);
}
