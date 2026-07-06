import type { PermissionKey } from "@/lib/auth/permission-keys";
import type { AppSession } from "@/lib/auth/app-session";
import { canReadReport } from "@/lib/reports/permissions";
import type { MonthPeriod, YearPeriod } from "@/lib/reports/period";
import type { ReportFormat, ReportId, ReportPeriod } from "@/lib/reports/types";

export type ReportCategory = "financial" | "membership" | "executive";

export type ReportCatalogEntry = {
  id: ReportId;
  title: string;
  description: string;
  category: ReportCategory;
  formats: ReportFormat[];
  periodKind: "month" | "year" | "none";
  rolesHint?: string;
};

export const REPORT_CATALOG: ReportCatalogEntry[] = [
  {
    id: "financial-monthly-cead",
    title: "Informe financiero mensual (CEAD)",
    description:
      "Ingresos, egresos y envíos al concilio según formato CEAD mensual.",
    category: "financial",
    formats: ["pdf", "xlsx"],
    periodKind: "month",
    rolesHint: "Tesorero, Pastor, Admin",
  },
  {
    id: "financial-monthly-concilio-f001",
    title: "Informe financiero mensual (CONCILIO)",
    description:
      "Formulario F.001 para envío al Concilio — ingresos, ministerios, egresos y envíos.",
    category: "financial",
    formats: ["pdf", "xlsx"],
    periodKind: "month",
    rolesHint: "Tesorero, Pastor, Admin",
  },
  {
    id: "membership-directory",
    title: "Directorio de miembros",
    description:
      "Listado de miembros y visitas con contacto, rol y estado de membresía.",
    category: "membership",
    formats: ["pdf", "xlsx"],
    periodKind: "none",
    rolesHint: "Secretario, Pastor, Admin",
  },
  {
    id: "membership-annual-cead",
    title: "Informe estadístico anual (CEAD)",
    description:
      "Formulario demográfico anual CEAD con datos auto-completados desde la BD.",
    category: "membership",
    formats: ["pdf"],
    periodKind: "year",
    rolesHint: "Secretario, Pastor, Admin",
  },
  {
    id: "executive-monthly-summary",
    title: "Resumen ejecutivo mensual",
    description:
      "Una página con KPIs financieros y de membresía para la junta directiva.",
    category: "executive",
    formats: ["pdf"],
    periodKind: "month",
    rolesHint: "Tesorero, Pastor, Admin",
  },
  {
    id: "financial-income-expense",
    title: "Estado de resultados",
    description: "Ingresos vs egresos por mes en tabla comparativa.",
    category: "financial",
    formats: ["pdf", "xlsx"],
    periodKind: "month",
    rolesHint: "Tesorero, Admin",
  },
  {
    id: "financial-by-fund",
    title: "Movimiento por fondo",
    description: "Aportes del período y saldo acumulado por fondo.",
    category: "financial",
    formats: ["pdf", "xlsx"],
    periodKind: "month",
    rolesHint: "Tesorero, Admin",
  },
  {
    id: "financial-by-member",
    title: "Contribuciones por miembro",
    description:
      "Desglose confidencial por miembro. Requiere permisos de finanzas.",
    category: "financial",
    formats: ["pdf", "xlsx"],
    periodKind: "month",
    rolesHint: "Tesorero, Admin",
  },
  {
    id: "audit-activity-log",
    title: "Bitácora de acciones",
    description:
      "Registro de actividad administrativa de la iglesia con filtros y exportación.",
    category: "executive",
    formats: ["pdf", "xlsx"],
    periodKind: "none",
    rolesHint: "Pastor, Admin",
  },
];

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  financial: "Financieros",
  membership: "Membresía",
  executive: "Ejecutivo",
};

export const REPORT_CATEGORY_ORDER: ReportCategory[] = [
  "financial",
  "membership",
  "executive",
];

export type ReportCategoryFilter = "all" | ReportCategory;

export const REPORT_CATEGORY_FILTERS: {
  key: ReportCategoryFilter;
  label: string;
}[] = [
  { key: "all", label: "Todos" },
  { key: "financial", label: REPORT_CATEGORY_LABELS.financial },
  { key: "membership", label: REPORT_CATEGORY_LABELS.membership },
  { key: "executive", label: REPORT_CATEGORY_LABELS.executive },
];

/** Catálogo visible según permisos granulares por reporte. */
export function filterCatalogForSession(
  session: AppSession,
  entries: ReportCatalogEntry[] = REPORT_CATALOG,
): ReportCatalogEntry[] {
  return entries.filter((entry) => canReadReport(session, entry.id));
}

export function filterCatalogByCategory(
  entries: ReportCatalogEntry[],
  category: ReportCategoryFilter,
): ReportCatalogEntry[] {
  if (category === "all") return entries;
  return entries.filter((entry) => entry.category === category);
}

export function periodForCatalogEntry(
  entry: ReportCatalogEntry,
  monthPeriod: MonthPeriod,
  yearPeriod: YearPeriod,
): ReportPeriod | undefined {
  if (entry.periodKind === "none") return undefined;
  if (entry.periodKind === "year") return yearPeriod;
  return monthPeriod;
}

export function formatLabelForEntry(
  entry: ReportCatalogEntry,
  monthPeriod: MonthPeriod,
  yearPeriod: YearPeriod,
): string | null {
  if (entry.periodKind === "none") return null;
  if (entry.periodKind === "year") return String(yearPeriod.year);
  return `${monthPeriod.month}/${monthPeriod.year}`;
}

export function catalogEntryById(id: ReportId): ReportCatalogEntry | undefined {
  return REPORT_CATALOG.find((entry) => entry.id === id);
}
