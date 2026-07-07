import type { Contribution } from "@/lib/contributions/types";
import {
  buildContributionMonthlyTotals,
  buildDashboardKpis,
} from "@/lib/dashboard/aggregate";
import { shiftYearMonth } from "@/lib/finance/month-period";
import { computeLedgerStats } from "@/lib/ledger/parse";
import type { LedgerEntry } from "@/lib/ledger/types";
import { memberFullName } from "@/lib/members/parse";
import type { MemberFilterKey, MembersListStats } from "@/lib/members/types";
import { CATECHUMEN_ROLE_CODE, findMemberRoleByCode } from "@/lib/members/roles";
import { monthBounds, formatReportPeriodLabel, type MonthPeriod } from "@/lib/reports/period";
import { buildConcilioF001MockPayload } from "@/lib/reports/templates/concilio/f001-mock";
import type { ConcilioF001Payload } from "@/lib/reports/templates/concilio/f001-types";
import { buildCeadFinancialMonthlyData } from "@/lib/reports/templates/cead/financial-monthly";
import {
  buildMembershipAnnualCeadFields,
  type MembershipAnnualCeadFields,
} from "@/lib/reports/templates/cead/membership-annual";
import type { ReportPeriod } from "@/lib/reports/types";
import { fetchIncomeEntriesPage } from "@/lib/services/contributions";
import { fetchFunds } from "@/lib/services/funds";
import { fetchFinanceLedgerPage } from "@/lib/services/ledger";
import {
  fetchMemberRoles,
  fetchMembersPage,
  fetchMembership,
} from "@/lib/services/members";
import {
  churchProfileToReportMeta,
  fetchChurchProfile,
} from "@/lib/services/church-profile";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportChurchMeta = {
  churchName?: string;
  pastorName?: string;
  presbyterio?: string;
  churchCode?: string;
  address?: string;
  treasurerName?: string;
};

export type FinancialMonthlyPayload = ReportChurchMeta & {
  churchId: number;
  period: MonthPeriod;
  cead: ReturnType<typeof buildCeadFinancialMonthlyData>;
  generatedAt: string;
};

export type MembershipDirectoryPayload = ReportChurchMeta & {
  churchId: number;
  filter: MemberFilterKey;
  stats: MembersListStats;
  members: Awaited<ReturnType<typeof fetchMembersPage>>["members"];
  generatedAt: string;
};

export type MembershipAnnualStatsPayload = ReportChurchMeta & {
  churchId: number;
  period: Extract<ReportPeriod, { kind: "year" }>;
  fields: MembershipAnnualCeadFields;
  generatedAt: string;
};

export type ExecutiveMonthlyKpi = {
  label: string;
  value: string;
  delta?: string;
};

export type ExecutiveMonthlyPayload = ReportChurchMeta & {
  churchId: number;
  period: MonthPeriod;
  periodLabel: string;
  kpis: ExecutiveMonthlyKpi[];
  contributionBreakdown: {
    tithe: number;
    offering: number;
    donation: number;
    total: number;
  };
  pendingAuthorizations: number;
  generatedAt: string;
};

export type FinancialIncomeExpensePayload = ReportChurchMeta & {
  period: MonthPeriod;
  periodLabel: string;
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  monthlyRows: { label: string; income: number; expense: number; net: number }[];
};

export type FinancialByFundPayload = ReportChurchMeta & {
  period: MonthPeriod;
  periodLabel: string;
  rows: {
    fundName: string;
    periodContributions: number;
    balance: number;
    isActive: boolean;
  }[];
};

export type FinancialByMemberPayload = ReportChurchMeta & {
  period: MonthPeriod;
  periodLabel: string;
  rows: {
    name: string;
    tithe: number;
    offering: number;
    donation: number;
    total: number;
  }[];
};

export type ConcilioF001ReportPayload = ConcilioF001Payload;

const REPORTS_PAGE_SIZE = 5000;
const MEMBERSHIP_FETCH_CHUNK = 40;

function isoNow(): string {
  return new Date().toISOString();
}

export async function fetchChurchReportMeta(
  supabase: SupabaseClient,
  churchId: number,
  overrides: ReportChurchMeta = {},
): Promise<ReportChurchMeta> {
  try {
    const profile = await fetchChurchProfile(supabase, churchId);
    return { ...churchProfileToReportMeta(profile), ...overrides };
  } catch {
    return overrides;
  }
}

async function fetchContributionsForPeriod(
  supabase: SupabaseClient,
  churchId: number,
  from: string,
  to: string,
): Promise<Contribution[]> {
  const page = await fetchIncomeEntriesPage(supabase, {
    churchId,
    dateFrom: from,
    dateTo: to,
    page: 1,
    pageSize: REPORTS_PAGE_SIZE,
  });
  return page.entries;
}

async function fetchLedgerForPeriod(
  supabase: SupabaseClient,
  churchId: number,
  from: string,
  to: string,
): Promise<LedgerEntry[]> {
  const page = await fetchFinanceLedgerPage(supabase, {
    churchId,
    dateFrom: from,
    dateTo: to,
    page: 1,
    pageSize: REPORTS_PAGE_SIZE,
  });
  return page.entries;
}

async function fetchMembershipMap(
  supabase: SupabaseClient,
  churchId: number,
  profileIds: string[],
): Promise<Map<string, Awaited<ReturnType<typeof fetchMembership>>>> {
  const map = new Map<string, Awaited<ReturnType<typeof fetchMembership>>>();
  for (let i = 0; i < profileIds.length; i += MEMBERSHIP_FETCH_CHUNK) {
    const chunk = profileIds.slice(i, i + MEMBERSHIP_FETCH_CHUNK);
    const results = await Promise.all(
      chunk.map((profileId) => fetchMembership(supabase, churchId, profileId)),
    );
    chunk.forEach((profileId, index) => {
      map.set(profileId, results[index] ?? null);
    });
  }
  return map;
}

export async function fetchFinancialMonthlyPayload(
  supabase: SupabaseClient,
  churchId: number,
  period: MonthPeriod,
  meta: ReportChurchMeta = {},
): Promise<FinancialMonthlyPayload> {
  const bounds = monthBounds(period);
  const [contributions, ledgerEntries] = await Promise.all([
    fetchContributionsForPeriod(supabase, churchId, bounds.from, bounds.to),
    fetchLedgerForPeriod(supabase, churchId, bounds.from, bounds.to),
  ]);

  return {
    churchId,
    period,
    cead: buildCeadFinancialMonthlyData(period, contributions, ledgerEntries),
    presbyterio: meta.presbyterio ?? "N/D",
    churchName: meta.churchName,
    pastorName: meta.pastorName,
    generatedAt: isoNow(),
  };
}

export async function fetchMembershipDirectoryPayload(
  supabase: SupabaseClient,
  churchId: number,
  filter: MemberFilterKey = "all",
  meta: ReportChurchMeta = {},
): Promise<MembershipDirectoryPayload> {
  const page = await fetchMembersPage(supabase, {
    churchId,
    filter,
    page: 1,
    pageSize: null,
  });

  return {
    churchId,
    filter,
    stats: page.stats,
    members: page.members,
    churchName: meta.churchName,
    generatedAt: isoNow(),
  };
}

export async function fetchMembershipAnnualStatsPayload(
  supabase: SupabaseClient,
  churchId: number,
  period: Extract<ReportPeriod, { kind: "year" }>,
  meta: ReportChurchMeta = {},
): Promise<MembershipAnnualStatsPayload> {
  const [page, roles] = await Promise.all([
    fetchMembersPage(supabase, {
      churchId,
      filter: "active",
      page: 1,
      pageSize: null,
    }),
    fetchMemberRoles(supabase),
  ]);

  const catechumenRole = findMemberRoleByCode(roles, CATECHUMEN_ROLE_CODE);
  const memberships = await fetchMembershipMap(
    supabase,
    churchId,
    page.members.map((m) => m.memberId),
  );

  return {
    churchId,
    period,
    fields: buildMembershipAnnualCeadFields({
      year: period.year,
      members: page.members,
      memberships,
      catechumenRoleId: catechumenRole?.id ?? null,
    }),
    presbyterio: meta.presbyterio ?? "N/D",
    churchName: meta.churchName,
    pastorName: meta.pastorName,
    generatedAt: isoNow(),
  };
}

export async function fetchExecutiveMonthlyPayload(
  supabase: SupabaseClient,
  churchId: number,
  period: MonthPeriod,
  meta: ReportChurchMeta = {},
): Promise<ExecutiveMonthlyPayload> {
  const bounds = monthBounds(period);
  const anchor = new Date(period.year, period.month - 1, 15);
  const prev = shiftYearMonth({ year: period.year, month: period.month }, -1);
  const wideFrom = monthBounds({ kind: "month", ...prev }).from;

  const [membersPage, funds, contributions, ledgerEntries] = await Promise.all([
    fetchMembersPage(supabase, { churchId, page: 1, pageSize: null }),
    fetchFunds(supabase, churchId),
    fetchContributionsForPeriod(supabase, churchId, wideFrom, bounds.to),
    fetchLedgerForPeriod(supabase, churchId, wideFrom, bounds.to),
  ]);

  const contributionMonthlyTotals = buildContributionMonthlyTotals(
    contributions,
    8,
    anchor,
  );
  const dashboardKpis = buildDashboardKpis({
    memberStats: membersPage.stats,
    funds,
    contributions,
    ledgerEntries,
    contributionMonthlyTotals,
    anchor,
  }).filter((kpi) => !kpi.mock);

  const monthContributions = contributions.filter(
    (entry) =>
      entry.paymentDate >= bounds.from && entry.paymentDate <= bounds.to,
  );

  const contributionBreakdown = monthContributions.reduce(
    (acc, entry) => {
      if (entry.category === "tithe") acc.tithe += entry.amount;
      else if (entry.category === "offering") acc.offering += entry.amount;
      else if (entry.category === "donation") acc.donation += entry.amount;
      acc.total += entry.amount;
      return acc;
    },
    { tithe: 0, offering: 0, donation: 0, total: 0 },
  );

  const pendingAuthorizations = ledgerEntries.filter(
    (entry) => entry.direction === "expense" && entry.status === "PENDING",
  ).length;

  const executiveKpis: ExecutiveMonthlyKpi[] = dashboardKpis.map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
    delta: kpi.delta,
  }));

  executiveKpis.push({
    label: "Egresos pendientes de autorización",
    value: String(pendingAuthorizations),
  });

  return {
    churchId,
    period,
    periodLabel: formatReportPeriodLabel(period),
    kpis: executiveKpis,
    contributionBreakdown,
    pendingAuthorizations,
    churchName: meta.churchName,
    pastorName: meta.pastorName,
    generatedAt: isoNow(),
  };
}

export async function fetchFinancialIncomeExpensePayload(
  supabase: SupabaseClient,
  churchId: number,
  period: MonthPeriod,
  meta: ReportChurchMeta = {},
): Promise<FinancialIncomeExpensePayload> {
  const anchor = new Date(period.year, period.month - 1, 15);
  const monthlyRows: FinancialIncomeExpensePayload["monthlyRows"] = [];

  for (let offset = -5; offset <= 0; offset += 1) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
    const month: MonthPeriod = {
      kind: "month",
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    };
    const bounds = monthBounds(month);
    const ledger = await fetchLedgerForPeriod(
      supabase,
      churchId,
      bounds.from,
      bounds.to,
    );
    const stats = computeLedgerStats(ledger);
    monthlyRows.push({
      label: formatReportPeriodLabel(month),
      income: stats.incomeAmount,
      expense: stats.expenseAmount,
      net: stats.incomeAmount - stats.expenseAmount,
    });
  }

  const current = monthlyRows[monthlyRows.length - 1]!;
  return {
    period,
    periodLabel: formatReportPeriodLabel(period),
    incomeTotal: current.income,
    expenseTotal: current.expense,
    netTotal: current.net,
    monthlyRows,
    churchName: meta.churchName,
  };
}

export async function fetchFinancialByFundPayload(
  supabase: SupabaseClient,
  churchId: number,
  period: MonthPeriod,
  meta: ReportChurchMeta = {},
): Promise<FinancialByFundPayload> {
  const bounds = monthBounds(period);
  const [funds, contributions] = await Promise.all([
    fetchFunds(supabase, churchId),
    fetchContributionsForPeriod(supabase, churchId, bounds.from, bounds.to),
  ]);

  const byFund = new Map<string, number>();
  for (const entry of contributions) {
    byFund.set(entry.fundId, (byFund.get(entry.fundId) ?? 0) + entry.amount);
  }

  return {
    period,
    periodLabel: formatReportPeriodLabel(period),
    rows: funds.map((fund) => ({
      fundName: fund.name,
      periodContributions: byFund.get(fund.fundId) ?? 0,
      balance: fund.totalContributions,
      isActive: fund.isActive,
    })),
    churchName: meta.churchName,
  };
}

export async function fetchFinancialByMemberPayload(
  supabase: SupabaseClient,
  churchId: number,
  period: MonthPeriod,
  meta: ReportChurchMeta = {},
): Promise<FinancialByMemberPayload> {
  const bounds = monthBounds(period);
  const [contributions, membersPage] = await Promise.all([
    fetchContributionsForPeriod(supabase, churchId, bounds.from, bounds.to),
    fetchMembersPage(supabase, { churchId, page: 1, pageSize: null }),
  ]);

  const nameByProfile = new Map(
    membersPage.members.map((m) => [m.memberId, memberFullName(m)]),
  );

  const byMember = new Map<
    string,
    { tithe: number; offering: number; donation: number; total: number }
  >();

  for (const entry of contributions) {
    if (!entry.profileId || entry.isAnonymous) continue;
    const key = entry.profileId;
    const row = byMember.get(key) ?? {
      tithe: 0,
      offering: 0,
      donation: 0,
      total: 0,
    };
    if (entry.category === "tithe") row.tithe += entry.amount;
    else if (entry.category === "offering") row.offering += entry.amount;
    else if (entry.category === "donation") row.donation += entry.amount;
    row.total += entry.amount;
    byMember.set(key, row);
  }

  const rows = [...byMember.entries()]
    .map(([profileId, totals]) => ({
      name: nameByProfile.get(profileId) ?? entryContributorLabel(profileId),
      ...totals,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    period,
    periodLabel: formatReportPeriodLabel(period),
    rows,
    churchName: meta.churchName,
  };
}

/** v1: mock estático — fase 2 conectará contribuciones/transacciones. */
export async function fetchConcilioF001Payload(
  supabase: SupabaseClient,
  churchId: number,
  period: MonthPeriod,
  meta: ReportChurchMeta = {},
): Promise<ConcilioF001ReportPayload> {
  const profileMeta = await fetchChurchReportMeta(supabase, churchId, meta);
  return buildConcilioF001MockPayload(churchId, period, {
    churchName: profileMeta.churchName,
    pastorName: meta.pastorName,
    presbyterio: profileMeta.presbyterio,
    treasurerName: meta.treasurerName,
    churchCode: profileMeta.churchCode,
    address: profileMeta.address,
  });
}

function entryContributorLabel(profileId: string): string {
  return `Perfil ${profileId.slice(0, 8)}`;
}
