import type { AuditLogEntry } from "@/lib/audit/types";
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
  from?: string;
};

export type IncomeExpenseBarPoint = {
  label: string;
  income: number;
  expense: number;
  from?: string;
};

export type DashboardKpi = {
  label: string;
  labelKey?: string;
  value: string;
  delta?: string;
  deltaKey?: string;
  deltaValues?: Record<string, string | number>;
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
  titleKey?: "pendingFundTransfer" | "pendingExpenseDefault";
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
  recentAudit: AuditLogEntry[];
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
