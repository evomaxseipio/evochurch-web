export const EVENT_TYPES = ["culto", "estudio", "evento"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type RecurrenceFrequency = "weekly" | "monthly";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number;
  byWeekday: number[];
  exceptions?: string[];
};

export type EventOccurrence = {
  seriesId: string;
  occurrenceDate: string;
  title: string;
  description: string | null;
  location: string | null;
  eventType: EventType;
  ministryId: string | null;
  ministryName: string | null;
  fundId: string | null;
  startsAt: string;
  endsAt: string | null;
  isAllDay: boolean;
  isFeatured: boolean;
  isWebsiteListed: boolean;
  isWebsitePromoted: boolean;
  isRecurring: boolean;
};

export type EventsPayload = {
  timezone: string;
  events: EventOccurrence[];
};

export type EventFormInput = {
  title: string;
  description: string;
  location: string;
  eventType: EventType;
  ministryId: string | null;
  fundId: string | null;
  localStartDate: string;
  localStartTime: string;
  localEndTime: string;
  isAllDay: boolean;
  isFeatured: boolean;
  isWebsiteListed: boolean;
  isWebsitePromoted: boolean;
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
  recurrenceUntil: string | null;
};

/** Serie almacenada (para editar/eliminar). */
export type EventSeries = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  eventType: EventType;
  ministryId: string | null;
  ministryName: string | null;
  fundId: string | null;
  localStartDate: string;
  localStartTime: string;
  localEndTime: string;
  isAllDay: boolean;
  isFeatured: boolean;
  isWebsiteListed: boolean;
  isWebsitePromoted: boolean;
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
  recurrenceUntil: string | null;
};
