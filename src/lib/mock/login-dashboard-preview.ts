import type { AuditLogEntry } from "@/lib/audit/types";
import type {
  DashboardChartData,
  DashboardHeroData,
  DashboardKpi,
  DashboardLedgerChartData,
  DashboardPayload,
  PendingAuthorizationItem,
} from "@/lib/dashboard/types";

const MONTH_LEDGER = [
  { label: "Ene", from: "2026-01-01", income: 12_000, expense: 8_000 },
  { label: "Feb", from: "2026-02-01", income: 10_000, expense: 15_000 },
  { label: "Mar", from: "2026-03-01", income: 18_000, expense: 6_000 },
  { label: "Abr", from: "2026-04-01", income: 22_000, expense: 9_000 },
  { label: "May", from: "2026-05-01", income: 16_000, expense: 11_000 },
  { label: "Jun", from: "2026-06-01", income: 28_000, expense: 7_500 },
  { label: "Jul", from: "2026-07-01", income: 50_000, expense: 500 },
];

const MONTH_CONTRIBUTIONS = [
  { label: "Ene", from: "2026-01-01", value: 3_500 },
  { label: "Feb", from: "2026-02-01", value: 2_800 },
  { label: "Mar", from: "2026-03-01", value: 4_200 },
  { label: "Abr", from: "2026-04-01", value: 185_000 },
  { label: "May", from: "2026-05-01", value: 6_100 },
  { label: "Jun", from: "2026-06-01", value: 3_900 },
  { label: "Jul", from: "2026-07-01", value: 1_000 },
];

const ledgerCharts: DashboardLedgerChartData = {
  week: MONTH_LEDGER.slice(-4),
  month: MONTH_LEDGER,
  quarter: MONTH_LEDGER.filter((_, i) => i % 2 === 0),
  year: MONTH_LEDGER,
};

const contributionCharts: DashboardChartData = {
  week: MONTH_CONTRIBUTIONS.slice(-4),
  month: MONTH_CONTRIBUTIONS,
  quarter: MONTH_CONTRIBUTIONS.filter((_, i) => i % 2 === 0),
  year: MONTH_CONTRIBUTIONS,
};

const hero: DashboardHeroData = {
  dateLabel: "Lunes, 6 de Julio de 2026",
  verse:
    "Porque donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos.",
  verseRef: "Mateo 18:20",
};

const kpis: DashboardKpi[] = [
  {
    labelKey: "kpiTotalMembers",
    label: "Total de miembros",
    value: "31",
    deltaKey: "deltaActiveMembers",
    deltaValues: { count: 31 },
      deltaDir: "up",
      icon: "users",
    accent: "var(--d-people)",
  },
  {
    labelKey: "kpiTotalCatechumens",
    label: "Total catecúmenos",
    value: "1",
    icon: "cross",
    accent: "var(--warm)",
  },
  {
    labelKey: "kpiFundsBalance",
    label: "Saldo en fondos",
    value: "RD$ 898.1K",
    deltaKey: "deltaActiveFunds",
    deltaValues: { count: 9 },
    deltaDir: "up",
    icon: "wallet",
    accent: "var(--d-funds)",
  },
  {
    labelKey: "kpiContributionsMonth",
    label: "Contribuciones (mes)",
    value: "RD$ 1K",
    delta: "-71.4%",
    deltaDir: "down",
    icon: "wallet",
    accent: "var(--d-income)",
    spark: [4_200, 6_100, 3_900, 2_800, 3_500, 1_200, 1_000],
  },
  {
    labelKey: "kpiUpcomingEvents",
    label: "Eventos próximos",
    value: "13",
    deltaKey: "deltaUpcomingThisWeek",
    deltaValues: { count: 3 },
    deltaDir: "up",
    icon: "cal",
    accent: "var(--info)",
  },
  {
    labelKey: "kpiNewVisitors",
    label: "Nuevos visitantes",
    value: "18",
    deltaKey: "deltaVisitorsVsLastWeek",
    deltaValues: { count: 6 },
    deltaDir: "up",
    icon: "pin",
    accent: "var(--lila)",
    spark: [8, 11, 12, 10, 14, 16, 18],
  },
  {
    labelKey: "kpiLedgerIncomeMonth",
    label: "Ingresos recibidos (mes)",
    value: "RD$ 50K",
    delta: "+3233.3%",
    deltaDir: "up",
    icon: "trendUp",
    accent: "var(--success)",
  },
  {
    labelKey: "kpiLedgerExpenseMonth",
    label: "Transacciones (mes)",
    value: "RD$ 50.5K",
    delta: "+100%",
    deltaDir: "up",
    icon: "arrowDn",
    accent: "var(--warm)",
  },
];

const pendingItems: PendingAuthorizationItem[] = [
  {
    id: "lp-1",
    kind: "expense",
    title: "compra saco de arroz",
    subtitle: "Cocina y Granero Iglesia · Fondo general",
    amount: 1_000,
    movementDate: "2026-06-10",
  },
  {
    id: "lp-2",
    kind: "expense",
    title: "PRUEBA 2",
    subtitle: "Fondos Cena Navideña · Fondo general",
    amount: 600,
    movementDate: "2026-01-10",
  },
];

const recentAudit: AuditLogEntry[] = [
  {
    id: "lp-a1",
    churchId: 0,
    actorDisplayName: "Pastor Bryan",
    module: "finances",
    action: "authorize",
    summary: "autorizó egreso compra saco de arroz",
    summaryParams: {},
    createdAt: "2026-07-06T21:45:00.000Z",
  },
  {
    id: "lp-a2",
    churchId: 0,
    actorDisplayName: "María López",
    module: "members",
    action: "create",
    summary: "registró nuevo miembro",
    summaryParams: {},
    createdAt: "2026-07-06T16:20:00.000Z",
  },
  {
    id: "lp-a3",
    churchId: 0,
    actorDisplayName: "Pastor Bryan",
    module: "eventos",
    action: "create",
    summary: "creó evento Culto Dominical",
    summaryParams: {},
    createdAt: "2026-07-05T11:00:00.000Z",
  },
  {
    id: "lp-a4",
    churchId: 0,
    actorDisplayName: "Carlos R.",
    module: "finances",
    action: "create",
    summary: "registró contribución RD$2,500",
    summaryParams: {},
    createdAt: "2026-07-04T09:30:00.000Z",
  },
];

export const loginDashboardPreviewEvents = [
  {
    id: 1,
    title: "Culto Dominical",
    date: "2026-05-10",
    time: "9:00 AM",
    type: "culto" as const,
    location: "Templo Principal",
  },
];

export const loginDashboardPreview: DashboardPayload & {
  pastorName: string;
  churchName: string;
} = {
  pastorName: "Bryan",
  churchName: "Fuente Inagotable",
  hero,
  kpis,
  pendingItems,
  recentAudit,
  contributionCharts,
  ledgerCharts,
  contributionPeriodTotals: {
    week: { current: 12_400, previous: 9_800 },
    month: { current: 201_200, previous: 3_500 },
    quarter: { current: 210_000, previous: 48_000 },
    year: { current: 210_000, previous: 120_000 },
  },
};
