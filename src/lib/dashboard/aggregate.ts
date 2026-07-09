import type { Contribution } from "@/lib/contributions/types";
import type { Fund } from "@/lib/funds/types";
import { computeLedgerStats } from "@/lib/ledger/parse";
import type { LedgerEntry } from "@/lib/ledger/types";
import { fmtRD } from "@/lib/format-currency";
import type { MembersListStats } from "@/lib/members/types";
import {
  buildPeriodBuckets,
  currentMonthBounds,
  formatHeroDateLabel,
  isDateInBucket,
  previousMonthBounds,
} from "@/lib/dashboard/period";
import type {
  ChartPoint,
  DashboardChartPeriod,
  DashboardHeroData,
  DashboardKpi,
  IncomeExpenseBarPoint,
  PendingAuthorizationItem,
  PeriodBucket,
  ScriptureVerse,
} from "@/lib/dashboard/types";
import { dashboardMock } from "@/lib/mock/dashboard-data";

function sumContributionsInBucket(
  entries: Contribution[],
  bucket: PeriodBucket,
): number {
  let total = 0;
  for (const entry of entries) {
    if (isDateInBucket(entry.paymentDate, bucket)) {
      total += entry.amount;
    }
  }
  return total;
}

function ledgerEntriesInBucket(
  entries: LedgerEntry[],
  bucket: PeriodBucket,
): LedgerEntry[] {
  return entries.filter((entry) =>
    isDateInBucket(entry.movementDate, bucket),
  );
}

export function formatPeriodDelta(
  current: number,
  previous: number,
  invertDir = false,
): { delta?: string; deltaDir?: "up" | "down" } {
  if (previous <= 0) {
    if (current <= 0) return {};
    return { delta: "+100%", deltaDir: invertDir ? "down" : "up" };
  }
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  const rawDir: "up" | "down" = pct >= 0 ? "up" : "down";
  const deltaDir = invertDir
    ? rawDir === "up"
      ? "down"
      : "up"
    : rawDir;
  return {
    delta: `${sign}${pct.toFixed(1)}%`,
    deltaDir,
  };
}

export function computeFundsBalance(funds: Fund[]): {
  total: number;
  activeCount: number;
} {
  let total = 0;
  let activeCount = 0;
  for (const fund of funds) {
    if (fund.isActive) {
      activeCount += 1;
      total += fund.totalContributions;
    }
  }
  return { total, activeCount };
}

export function buildContributionMonthlyTotals(
  entries: Contribution[],
  months = 8,
  anchor = new Date(),
): number[] {
  const buckets = buildPeriodBuckets("month", anchor).slice(-months);
  return buckets.map((bucket) => sumContributionsInBucket(entries, bucket));
}

export function aggregateContributionsChart(
  entries: Contribution[],
  period: DashboardChartPeriod,
  anchor = new Date(),
): ChartPoint[] {
  const buckets = buildPeriodBuckets(period, anchor);
  return buckets.map((bucket) => ({
    label: bucket.label,
    value: sumContributionsInBucket(entries, bucket),
  }));
}

export function aggregateIncomeExpenseChart(
  entries: LedgerEntry[],
  period: DashboardChartPeriod,
  anchor = new Date(),
): IncomeExpenseBarPoint[] {
  const buckets = buildPeriodBuckets(period, anchor);
  return buckets.map((bucket) => {
    const scoped = ledgerEntriesInBucket(entries, bucket);
    const stats = computeLedgerStats(scoped);
    return {
      label: bucket.label,
      income: stats.incomeAmount,
      expense: stats.expenseAmount,
    };
  });
}

export function extractPendingAuthorizations(
  entries: LedgerEntry[],
  limit = 8,
): PendingAuthorizationItem[] {
  const pending = entries
    .filter(
      (entry) =>
        entry.direction === "expense" && entry.status === "PENDING",
    )
    .sort((a, b) => b.movementDate.localeCompare(a.movementDate));

  return pending.slice(0, limit).map((entry) => {
    const isTransfer = Boolean(entry.isFundTransfer);
    const description = entry.description || entry.typeName || "";
    return {
      id: entry.entryId,
      kind: isTransfer ? "fund_transfer" : "expense",
      title: isTransfer ? "" : description,
      titleKey: isTransfer
        ? "pendingFundTransfer"
        : !description.trim()
          ? "pendingExpenseDefault"
          : undefined,
      subtitle: isTransfer
        ? `${entry.transferSourceFundName ?? entry.fundName} → ${entry.transferDestinationFundName ?? "—"}`
        : `${entry.fundName} · ${entry.createdBy}`,
      amount: entry.amount,
      movementDate: entry.movementDate,
    };
  });
}

export function buildDashboardHero(params: {
  verse: ScriptureVerse | null;
  anchor?: Date;
  locale?: import("@/i18n/config").Locale;
}): DashboardHeroData {
  const anchor = params.anchor ?? new Date();
  const locale = params.locale ?? "es";
  const fallbackVerse = {
    text: dashboardMock.hero.verse,
    reference: dashboardMock.hero.verseRef,
  };
  const verse = params.verse ?? fallbackVerse;

  return {
    dateLabel: formatHeroDateLabel(anchor, locale),
    verse: verse.text,
    verseRef: verse.reference,
  };
}

export function buildDashboardKpis(params: {
  memberStats: MembersListStats;
  funds: Fund[];
  contributions: Contribution[];
  ledgerEntries: LedgerEntry[];
  contributionMonthlyTotals: number[];
  anchor?: Date;
}): DashboardKpi[] {
  const anchor = params.anchor ?? new Date();
  const currentMonth = currentMonthBounds(anchor);
  const previousMonth = previousMonthBounds(anchor);

  const fundsBalance = computeFundsBalance(params.funds);

  const contributionsThisMonth = sumContributionsInBucket(
    params.contributions,
    currentMonth,
  );
  const contributionsPrevMonth = sumContributionsInBucket(
    params.contributions,
    previousMonth,
  );
  const contributionsDelta = formatPeriodDelta(
    contributionsThisMonth,
    contributionsPrevMonth,
  );

  const ledgerThisMonth = computeLedgerStats(
    params.ledgerEntries.filter((e) =>
      isDateInBucket(e.movementDate, currentMonth),
    ),
  );
  const ledgerPrevMonth = computeLedgerStats(
    params.ledgerEntries.filter((e) =>
      isDateInBucket(e.movementDate, previousMonth),
    ),
  );
  const incomeDelta = formatPeriodDelta(
    ledgerThisMonth.incomeAmount,
    ledgerPrevMonth.incomeAmount,
  );
  const expenseDelta = formatPeriodDelta(
    ledgerThisMonth.expenseAmount,
    ledgerPrevMonth.expenseAmount,
    true,
  );

  const mockEvents = dashboardMock.kpis[3];
  const mockVisitors = dashboardMock.kpis[4];

  return [
    {
      label: "Total de Miembros",
      value: params.memberStats.total.toLocaleString("es-DO"),
      delta: `${params.memberStats.active.toLocaleString("es-DO")} activos`,
      deltaDir: "up",
      icon: "users",
      accent: "var(--d-people)",
    },
    {
      label: "Saldo en fondos",
      value: fmtRD(fundsBalance.total),
      delta: `${fundsBalance.activeCount} fondo${fundsBalance.activeCount === 1 ? "" : "s"} activo${fundsBalance.activeCount === 1 ? "" : "s"}`,
      deltaDir: "up",
      icon: "wallet",
      accent: "var(--d-funds)",
    },
    {
      label: "Contribuciones (mes)",
      value: fmtRD(contributionsThisMonth),
      delta: contributionsDelta.delta,
      deltaDir: contributionsDelta.deltaDir,
      icon: "wallet",
      accent: "var(--d-income)",
      spark: params.contributionMonthlyTotals,
    },
    {
      label: mockEvents.label,
      value: mockEvents.value,
      delta: mockEvents.delta,
      deltaDir: mockEvents.deltaDir,
      icon: mockEvents.icon,
      accent: mockEvents.accent,
      mock: true,
    },
    {
      label: mockVisitors.label,
      value: mockVisitors.value,
      delta: mockVisitors.delta,
      deltaDir: mockVisitors.deltaDir,
      icon: mockVisitors.icon,
      accent: mockVisitors.accent,
      spark: mockVisitors.spark,
      mock: true,
    },
    {
      label: "Ingresos recibidos (mes)",
      value: fmtRD(ledgerThisMonth.incomeAmount),
      delta: incomeDelta.delta,
      deltaDir: incomeDelta.deltaDir,
      icon: "trendUp",
      accent: "var(--success)",
    },
    {
      label: "Transacciones (mes)",
      value: fmtRD(ledgerThisMonth.expenseAmount),
      delta: expenseDelta.delta,
      deltaDir: expenseDelta.deltaDir,
      icon: "arrowDn",
      accent: "var(--warm)",
    },
  ];
}
