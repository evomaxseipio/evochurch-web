import { parseDashboardSummaryResponse } from "@/lib/dashboard/parse";
import type { DashboardPayload } from "@/lib/dashboard/types";
import type { Locale } from "@/i18n/config";
import { fetchDailyScriptureVerse } from "@/lib/services/scripture-verses";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchDashboardPayload(
  supabase: SupabaseClient,
  churchId: number,
  locale: Locale = "es",
): Promise<DashboardPayload> {
  const [summaryResult, verse] = await Promise.all([
    supabase.rpc("sp_get_dashboard_summary", {
      p_church_id: churchId,
      p_months: 12,
    }),
    fetchDailyScriptureVerse(supabase),
  ]);

  if (summaryResult.error) throw summaryResult.error;
  return parseDashboardSummaryResponse(summaryResult.data, verse, locale);
}
