import {
  parseAuditLogPageResponse,
  parseRecentAuditLogResponse,
} from "@/lib/audit/parse";
import type { AuditLogFilters, AuditLogPage } from "@/lib/audit/types";
import type { AuditLogEntry } from "@/lib/audit/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchRecentAuditLog(
  supabase: SupabaseClient,
  churchId: number,
  limit = 15,
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase.rpc("sp_list_church_audit_log", {
    p_church_id: churchId,
    p_limit: limit,
    p_offset: 0,
  });

  if (error) throw error;
  const page = parseAuditLogPageResponse(data);
  return page.items;
}

export async function fetchAuditLogPage(
  supabase: SupabaseClient,
  churchId: number,
  filters: AuditLogFilters = {},
): Promise<AuditLogPage> {
  const { data, error } = await supabase.rpc("sp_list_church_audit_log", {
    p_church_id: churchId,
    p_from: filters.from ?? null,
    p_to: filters.to ?? null,
    p_module: filters.module ?? null,
    p_action: filters.action ?? null,
    p_actor_profile_id: filters.actorProfileId ?? null,
    p_search: filters.search ?? null,
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
  });

  if (error) throw error;
  return parseAuditLogPageResponse(data);
}

export function parseDashboardRecentAudit(data: unknown): AuditLogEntry[] {
  return parseRecentAuditLogResponse(data);
}
