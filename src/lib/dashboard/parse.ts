import {
  buildDashboardHero,
  formatPeriodDelta,
} from "@/lib/dashboard/aggregate";
import type {
  ChartPoint,
  DashboardChartData,
  DashboardChartPeriod,
  DashboardHeroData,
  DashboardKpi,
  DashboardLedgerChartData,
  DashboardPayload,
  IncomeExpenseBarPoint,
  PendingAuthorizationItem,
} from "@/lib/dashboard/types";
import { CHART_PERIODS } from "@/lib/dashboard/types";
import { formatHeroDateLabel } from "@/lib/dashboard/period";
import { fmtRD } from "@/lib/format-currency";
import type { Locale } from "@/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import type { MembersListStats } from "@/lib/members/types";
import { parseDashboardRecentAudit } from "@/lib/services/audit-log";
import { dashboardMock } from "@/lib/mock/dashboard-data";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

function parseChartPoints(raw: unknown): ChartPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((row) => ({
      label: asString(row.label),
      value: Math.round(asNumber(row.value)),
      from: asString(row.from) || undefined,
    }));
}

function parseLedgerBarPoints(raw: unknown): IncomeExpenseBarPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((row) => ({
      label: asString(row.label),
      income: Math.round(asNumber(row.income)),
      expense: Math.round(asNumber(row.expense)),
      from: asString(row.from) || undefined,
    }));
}

function parsePeriodCharts(raw: unknown): DashboardChartData {
  const root = asRecord(raw) ?? {};
  const out = {} as DashboardChartData;
  for (const period of CHART_PERIODS) {
    out[period] = parseChartPoints(root[period]);
  }
  return out;
}

function parseLedgerPeriodCharts(raw: unknown): DashboardLedgerChartData {
  const root = asRecord(raw) ?? {};
  const out = {} as DashboardLedgerChartData;
  for (const period of CHART_PERIODS) {
    out[period] = parseLedgerBarPoints(root[period]);
  }
  return out;
}

function sumChartValues(points: ChartPoint[]): number {
  return points.reduce((sum, point) => sum + point.value, 0);
}

function periodTotalsFromCharts(
  charts: DashboardChartData,
): DashboardPayload["contributionPeriodTotals"] {
  const out = {} as DashboardPayload["contributionPeriodTotals"];
  for (const period of CHART_PERIODS) {
    const points = charts[period];
    const current = sumChartValues(points);
    const previous =
      points.length >= 2
        ? points[points.length - 2]?.value ?? 0
        : 0;
    out[period] = { current, previous };
  }
  return out;
}

function parsePendingItems(raw: unknown): PendingAuthorizationItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((row) => {
      const kind = (asString(row.kind) === "fund_transfer"
        ? "fund_transfer"
        : "expense") as PendingAuthorizationItem["kind"];
      const title = asString(row.title);
      const titleKey =
        kind === "fund_transfer"
          ? ("pendingFundTransfer" as const)
          : !title.trim() || title === "Egreso pendiente"
            ? ("pendingExpenseDefault" as const)
            : undefined;

      return {
        id: asString(row.id),
        kind,
        title,
        titleKey,
        subtitle: asString(row.subtitle),
        amount: Math.round(asNumber(row.amount)),
        movementDate: asString(row.movement_date ?? row.movementDate),
      };
    })
    .filter((item) => item.id.length > 0);
}

function buildDashboardKpisFromSummary(params: {
  memberStats: MembersListStats;
  catechumenCount: number;
  fundsSummary: { totalBalance: number; activeCount: number };
  contributionMonthlyTotals: number[];
  eventsSummary?: { upcomingCount: number; thisWeekCount: number };
  kpiMonth: {
    contributionsThisMonth: number;
    contributionsPrevMonth: number;
    ledgerIncomeThisMonth: number;
    ledgerIncomePrevMonth: number;
    ledgerExpenseThisMonth: number;
    ledgerExpensePrevMonth: number;
  };
  locale?: Locale;
}): DashboardKpi[] {
  const locale = params.locale ?? "es";
  const contributionsDelta = formatPeriodDelta(
    params.kpiMonth.contributionsThisMonth,
    params.kpiMonth.contributionsPrevMonth,
  );
  const incomeDelta = formatPeriodDelta(
    params.kpiMonth.ledgerIncomeThisMonth,
    params.kpiMonth.ledgerIncomePrevMonth,
  );
  const expenseDelta = formatPeriodDelta(
    params.kpiMonth.ledgerExpenseThisMonth,
    params.kpiMonth.ledgerExpensePrevMonth,
    true,
  );

  const mockEvents = dashboardMock.kpis[3];
  const mockVisitors = dashboardMock.kpis[4];
  const eventsUpcoming = params.eventsSummary?.upcomingCount ?? 0;
  const eventsThisWeek = params.eventsSummary?.thisWeekCount ?? 0;
  const hasRealEvents = params.eventsSummary != null;

  return [
    {
      labelKey: "kpiTotalMembers",
      label: "Total de Miembros",
      value: formatNumber(params.memberStats.total, locale),
      deltaKey: "deltaActiveMembers",
      deltaValues: { count: params.memberStats.active },
      deltaDir: "up",
      icon: "users",
      accent: "var(--d-people)",
    },
    {
      labelKey: "kpiTotalCatechumens",
      label: "Total catecúmenos",
      value: formatNumber(params.catechumenCount, locale),
      icon: "cross",
      accent: "var(--warm)",
    },
    {
      labelKey: "kpiFundsBalance",
      label: "Saldo en fondos",
      value: fmtRD(params.fundsSummary.totalBalance, locale),
      deltaKey: "deltaActiveFunds",
      deltaValues: { count: params.fundsSummary.activeCount },
      deltaDir: "up",
      icon: "wallet",
      accent: "var(--d-funds)",
    },
    {
      labelKey: "kpiContributionsMonth",
      label: "Contribuciones (mes)",
      value: fmtRD(params.kpiMonth.contributionsThisMonth, locale),
      delta: contributionsDelta.delta,
      deltaDir: contributionsDelta.deltaDir,
      icon: "wallet",
      accent: "var(--d-income)",
      spark: params.contributionMonthlyTotals,
    },
    {
      labelKey: "kpiUpcomingEvents",
      label: mockEvents.label,
      value: hasRealEvents
        ? formatNumber(eventsUpcoming, locale)
        : mockEvents.value,
      deltaKey: "deltaUpcomingThisWeek",
      deltaValues: { count: hasRealEvents ? eventsThisWeek : 3 },
      deltaDir: mockEvents.deltaDir,
      icon: mockEvents.icon,
      accent: mockEvents.accent,
      mock: !hasRealEvents,
    },
    {
      labelKey: "kpiNewVisitors",
      label: mockVisitors.label,
      value: mockVisitors.value,
      deltaKey: "deltaVisitorsVsLastWeek",
      deltaValues: { count: 6 },
      deltaDir: mockVisitors.deltaDir,
      icon: mockVisitors.icon,
      accent: mockVisitors.accent,
      spark: mockVisitors.spark,
      mock: true,
    },
    {
      labelKey: "kpiLedgerIncomeMonth",
      label: "Ingresos recibidos (mes)",
      value: fmtRD(params.kpiMonth.ledgerIncomeThisMonth, locale),
      delta: incomeDelta.delta,
      deltaDir: incomeDelta.deltaDir,
      icon: "trendUp",
      accent: "var(--success)",
    },
    {
      labelKey: "kpiLedgerExpenseMonth",
      label: "Transacciones (mes)",
      value: fmtRD(params.kpiMonth.ledgerExpenseThisMonth, locale),
      delta: expenseDelta.delta,
      deltaDir: expenseDelta.deltaDir,
      icon: "arrowDn",
      accent: "var(--warm)",
    },
  ];
}

export function parseDashboardSummaryResponse(
  data: unknown,
  verse: { reference: string; text: string } | null,
  locale: Locale = "es",
): DashboardPayload {
  const root = asRecord(data);
  if (!root || root.success === false) {
    throw new Error(asString(root?.message) || "No se pudo cargar el dashboard.");
  }

  const memberStatsRaw = asRecord(root.member_stats) ?? {};
  const fundsRaw = asRecord(root.funds_summary) ?? {};
  const kpiMonthRaw = asRecord(root.kpi_month) ?? {};
  const eventsSummaryRaw = asRecord(root.events_summary);

  const memberStats: MembersListStats = {
    total: asNumber(memberStatsRaw.total),
    members: asNumber(memberStatsRaw.members),
    visits: asNumber(memberStatsRaw.visits),
    active: asNumber(memberStatsRaw.active),
    inactive: asNumber(memberStatsRaw.inactive),
  };

  const contributionMonthlyTotals = Array.isArray(root.contribution_monthly_totals)
    ? root.contribution_monthly_totals.map((v) => Math.round(asNumber(v)))
    : [];

  const contributionCharts = parsePeriodCharts(root.contribution_chart);
  const ledgerCharts = parseLedgerPeriodCharts(root.ledger_chart);

  const hero: DashboardHeroData = buildDashboardHero({ verse, locale });

  const kpis = buildDashboardKpisFromSummary({
    memberStats,
    catechumenCount: asNumber(root.catechumen_count),
    fundsSummary: {
      totalBalance: Math.round(asNumber(fundsRaw.total_balance)),
      activeCount: asNumber(fundsRaw.active_count),
    },
    contributionMonthlyTotals,
    eventsSummary: eventsSummaryRaw
      ? {
          upcomingCount: asNumber(eventsSummaryRaw.upcoming_count),
          thisWeekCount: asNumber(eventsSummaryRaw.this_week_count),
        }
      : undefined,
    kpiMonth: {
      contributionsThisMonth: Math.round(
        asNumber(kpiMonthRaw.contributions_this_month),
      ),
      contributionsPrevMonth: Math.round(
        asNumber(kpiMonthRaw.contributions_prev_month),
      ),
      ledgerIncomeThisMonth: Math.round(
        asNumber(kpiMonthRaw.ledger_income_this_month),
      ),
      ledgerIncomePrevMonth: Math.round(
        asNumber(kpiMonthRaw.ledger_income_prev_month),
      ),
      ledgerExpenseThisMonth: Math.round(
        asNumber(kpiMonthRaw.ledger_expense_this_month),
      ),
      ledgerExpensePrevMonth: Math.round(
        asNumber(kpiMonthRaw.ledger_expense_prev_month),
      ),
    },
    locale,
  });

  return {
    hero,
    kpis,
    pendingItems: parsePendingItems(root.pending_authorizations),
    recentAudit: parseDashboardRecentAudit(root.recent_audit),
    contributionCharts,
    ledgerCharts,
    contributionPeriodTotals: periodTotalsFromCharts(contributionCharts),
  };
}

export { formatHeroDateLabel };
