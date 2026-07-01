import type { IconName } from "@/components/icons";
import type { Contribution } from "@/lib/contributions/types";
import type { LedgerEntry } from "@/lib/ledger/types";

export type DashboardChartPeriod = "week" | "month" | "quarter" | "year";

export type PeriodBucket = {
  key: string;
  label: string;
  from: string;
  to: string;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type IncomeExpenseBarPoint = {
  label: string;
  income: number;
  expense: number;
};

export type DashboardKpi = {
  label: string;
  value: string;
  delta?: string;
  deltaDir?: "up" | "down";
  feature?: boolean;
  spark?: number[];
  icon?: IconName;
  accent?: string;
  mock?: boolean;
};

export type DashboardHeroData = {
  dateLabel: string;
  attendance: string;
  attendanceDisclaimer: string;
  offering: string;
  catechumens: string;
  verse: string;
  verseRef: string;
};

export type ScriptureVerse = {
  reference: string;
  text: string;
};

export type PendingAuthorizationItem = {
  id: string;
  kind: "expense" | "fund_transfer";
  title: string;
  subtitle: string;
  amount: number;
  movementDate: string;
};

export type DashboardPayload = {
  hero: DashboardHeroData;
  kpis: DashboardKpi[];
  contributions: Contribution[];
  ledgerEntries: LedgerEntry[];
  pendingItems: PendingAuthorizationItem[];
  contributionMonthlyTotals: number[];
};

export const CATECHUMEN_ROLE = "Catecumenos";

export const CHART_PERIOD_LABELS: Record<DashboardChartPeriod, string> = {
  week: "Semana",
  month: "Mes",
  quarter: "Trimestre",
  year: "Año",
};

export const CHART_PERIODS: DashboardChartPeriod[] = [
  "week",
  "month",
  "quarter",
  "year",
];
