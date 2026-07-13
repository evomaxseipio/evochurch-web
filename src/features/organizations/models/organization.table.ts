/** Metadatos de persistencia — sin lógica. */

export const SALES_SCHEMA = "sales" as const;

export const ORGANIZATIONS_TABLE = "organizations" as const;

export const ORGANIZATIONS_OPEN_VIEW = "v_organizations_open" as const;

/** Canal Realtime: schema:table */
export const ORGANIZATIONS_REALTIME_TOPIC = `${SALES_SCHEMA}:${ORGANIZATIONS_TABLE}` as const;

export function organizationRealtimeFilter(organizationId: string): string {
  return `id=eq.${organizationId}`;
}
