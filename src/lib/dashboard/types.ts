import type { IconName } from "@/components/icons";

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

export type DashboardChartData = Record<DashboardChartPeriod, ChartPoint[]>;
export type DashboardLedgerChartData = Record<
  DashboardChartPeriod,
  IncomeExpenseBarPoint[]
>;

export type DashboardPayload = {
  hero: DashboardHeroData;
  kpis: DashboardKpi[];
  pendingItems: PendingAuthorizationItem[];
  contributionCharts: DashboardChartData;
  ledgerCharts: DashboardLedgerChartData;
  contributionPeriodTotals: Record<
    DashboardChartPeriod,
    { current: number; previous: number }
  >;
};

export const CATECHUMEN_ROLE_CODE = "catecumenos";

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
