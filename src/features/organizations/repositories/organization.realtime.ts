import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import {
  ORGANIZATIONS_REALTIME_TOPIC,
  ORGANIZATIONS_TABLE,
  SALES_SCHEMA,
  organizationRealtimeFilter,
} from "../models/organization.table";
import type { Organization } from "../types";

export type OrganizationRealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

export type OrganizationRealtimeHandlers = {
  onInsert?: (row: Organization) => void;
  onUpdate?: (row: Organization) => void;
  onDelete?: (row: Organization) => void;
  onChange?: (
    event: OrganizationRealtimeEvent,
    row: Organization,
  ) => void;
};

export type OrganizationRealtimeSubscription = {
  channel: RealtimeChannel;
  unsubscribe: () => Promise<void>;
};

function rowFromPayload(
  payload: RealtimePostgresChangesPayload<Organization>,
): Organization | null {
  const row = payload.new ?? payload.old;
  return row && typeof row === "object" ? (row as Organization) : null;
}

/**
 * Suscripción Realtime a sales.organizations.
 * Requiere publicación Realtime habilitada para el schema sales en Supabase.
 */
export function subscribeToOrganizations(
  supabase: SupabaseClient,
  handlers: OrganizationRealtimeHandlers,
  organizationId?: string,
): OrganizationRealtimeSubscription {
  const channelName = organizationId
    ? `${ORGANIZATIONS_REALTIME_TOPIC}:${organizationId}`
    : ORGANIZATIONS_REALTIME_TOPIC;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: SALES_SCHEMA,
        table: ORGANIZATIONS_TABLE,
        ...(organizationId
          ? { filter: organizationRealtimeFilter(organizationId) }
          : {}),
      },
      (payload) => {
        const row = rowFromPayload(
          payload as RealtimePostgresChangesPayload<Organization>,
        );
        if (!row) return;

        const event = payload.eventType as OrganizationRealtimeEvent;
        handlers.onChange?.(event, row);

        if (event === "INSERT") handlers.onInsert?.(row);
        if (event === "UPDATE") handlers.onUpdate?.(row);
        if (event === "DELETE") handlers.onDelete?.(row);
      },
    )
    .subscribe();

  return {
    channel,
    unsubscribe: async () => {
      await supabase.removeChannel(channel);
    },
  };
}
