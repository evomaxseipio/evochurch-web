import { parseDashboardSummaryResponse } from "@/lib/dashboard/parse";
import type { DashboardPayload } from "@/lib/dashboard/types";
import type { Locale } from "@/i18n/config";
import { fetchRecentAuditLog } from "@/lib/services/audit-log";
import { fetchDailyScriptureVerse } from "@/lib/services/scripture-verses";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchDashboardPayload(
  supabase: SupabaseClient,
  churchId: number,
  locale: Locale = "es",
  options?: { includeAuditLog?: boolean },
): Promise<DashboardPayload> {
  const includeAuditLog = options?.includeAuditLog === true;

  const [summaryResult, verse, recentAuditResult] = await Promise.all([
    supabase.rpc("sp_get_dashboard_summary", {
      p_church_id: churchId,
      p_months: 12,
    }),
    fetchDailyScriptureVerse(supabase),
    includeAuditLog
      ? fetchRecentAuditLog(supabase, churchId, 15).catch((error) => {
          if (process.env.NODE_ENV === "development") {
            console.error("fetchRecentAuditLog:", error);
          }
          return null;
        })
      : Promise.resolve(null),
  ]);

  if (summaryResult.error) throw summaryResult.error;

  const payload = parseDashboardSummaryResponse(
    summaryResult.data,
    verse,
    locale,
  );

  const recentAudit = !includeAuditLog
    ? []
    : recentAuditResult && recentAuditResult.length > 0
      ? recentAuditResult
      : payload.recentAudit;

  return { ...payload, recentAudit };
}
