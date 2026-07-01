import {
  buildContributionMonthlyTotals,
  buildDashboardHero,
  buildDashboardKpis,
  extractPendingAuthorizations,
} from "@/lib/dashboard/aggregate";
import { todayIso } from "@/lib/dashboard/period";
import type { DashboardPayload } from "@/lib/dashboard/types";
import { CATECHUMEN_ROLE } from "@/lib/dashboard/types";
import type { Contribution } from "@/lib/contributions/types";
import { fetchIncomeEntries } from "@/lib/services/contributions";
import { fetchFunds } from "@/lib/services/funds";
import { fetchFinanceLedger } from "@/lib/services/ledger";
import { fetchMembersPage } from "@/lib/services/members";
import { fetchDailyScriptureVerse } from "@/lib/services/scripture-verses";
import type { SupabaseClient } from "@supabase/supabase-js";

function sumContributionsOnDate(
  entries: Contribution[],
  isoDate: string,
): number {
  let total = 0;
  for (const entry of entries) {
    if (entry.paymentDate.slice(0, 10) === isoDate) {
      total += entry.amount;
    }
  }
  return total;
}

export async function fetchCatechumenCount(
  supabase: SupabaseClient,
  churchId: number,
): Promise<number> {
  const { count, error } = await supabase
    .from("membership")
    .select("*", { count: "exact", head: true })
    .eq("church_id", churchId)
    .eq("membership_role", CATECHUMEN_ROLE);

  if (error) throw error;
  return count ?? 0;
}

export async function fetchDashboardPayload(
  supabase: SupabaseClient,
  churchId: number,
): Promise<DashboardPayload> {
  const [
    membersPage,
    funds,
    contributions,
    ledgerResult,
    verse,
    catechumenCount,
  ] = await Promise.all([
    fetchMembersPage(supabase, { churchId, page: 1, pageSize: 1 }),
    fetchFunds(supabase, churchId),
    fetchIncomeEntries(supabase, churchId),
    fetchFinanceLedger(supabase, churchId),
    fetchDailyScriptureVerse(supabase),
    fetchCatechumenCount(supabase, churchId),
  ]);

  const ledgerEntries = ledgerResult.entries;
  const offeringToday = sumContributionsOnDate(contributions, todayIso());
  const contributionMonthlyTotals = buildContributionMonthlyTotals(
    contributions,
  );

  return {
    hero: buildDashboardHero({
      verse,
      offeringToday,
      catechumenCount,
    }),
    kpis: buildDashboardKpis({
      memberStats: membersPage.stats,
      funds,
      contributions,
      ledgerEntries,
      contributionMonthlyTotals,
    }),
    contributions,
    ledgerEntries,
    pendingItems: extractPendingAuthorizations(ledgerEntries),
    contributionMonthlyTotals,
  };
}
