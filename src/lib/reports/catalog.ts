import type { ReportDiscountSectionKey } from "@/lib/discounts/types";
import type { AppSession } from "@/lib/auth/app-session";
import { canReadReport } from "@/lib/reports/permissions";
import type { MonthPeriod, YearPeriod } from "@/lib/reports/period";
import type { ReportFormat, ReportId, ReportPeriod } from "@/lib/reports/types";
import type { ChurchReportDefinition } from "@/lib/services/report-definitions";
import { reportDefinitionsById } from "@/lib/services/report-definitions";

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
  {
    id: "family-households",
    title: "Familias",
    description:
      "Hogares derivados de vínculos familiares (cónyuge e hijos) para pastoral e impresión.",
    category: "membership",
    formats: [],
    periodKind: "none",
    rolesHint: "Secretario, Pastor, Admin",
  },
  {
    id: "tithe-weekly-close",
    title: "Cierre semanal de diezmos",
    description:
      "Resumen de diezmos por semana (domingo a domingo) y reparto según plantilla activa.",
    category: "financial",
    formats: ["pdf"],
    periodKind: "none",
    rolesHint: "Tesorero, Admin",
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

function definitionForReport(
  reportId: ReportId,
  definitions?: ChurchReportDefinition[],
): ChurchReportDefinition | undefined {
  if (!definitions?.length) return undefined;
  return reportDefinitionsById(definitions).get(reportId);
}

function isReportActiveInRegistry(
  reportId: ReportId,
  definitions?: ChurchReportDefinition[],
): boolean {
  const def = definitionForReport(reportId, definitions);
  return def ? def.isActive : true;
}

/** Catálogo visible según permisos granulares por reporte y registro en BD. */
export function filterCatalogForSession(
  session: AppSession,
  entries: ReportCatalogEntry[] = REPORT_CATALOG,
  definitions?: ChurchReportDefinition[],
): ReportCatalogEntry[] {
  return entries.filter(
    (entry) =>
      canReadReport(session, entry.id) &&
      isReportActiveInRegistry(entry.id, definitions),
  );
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

export function reportPlatformSupportsDiscountTemplates(
  reportId: ReportId,
  definitions?: ChurchReportDefinition[],
): boolean {
  const def = definitionForReport(reportId, definitions);
  return def?.platformSupportsDiscountTemplates === true;
}

export function reportSupportsDiscountTemplates(
  reportId: ReportId,
  definitions?: ChurchReportDefinition[],
): boolean {
  const def = definitionForReport(reportId, definitions);
  if (def) return def.supportsDiscountTemplates && def.isActive;
  return false;
}

export function reportDiscountSectionKey(
  reportId: ReportId,
  definitions?: ChurchReportDefinition[],
): ReportDiscountSectionKey {
  const def = definitionForReport(reportId, definitions);
  return def?.discountSectionKey ?? "council_sends";
}

/** Reports flagged for discount templates in BD, filtered by permissions and is_active. */
export function getDiscountLinkableReportEntries(
  session?: Pick<AppSession, "permissions"> | null,
  definitions?: ChurchReportDefinition[],
): ReportCatalogEntry[] {
  return REPORT_CATALOG.filter((entry) => {
    if (!reportSupportsDiscountTemplates(entry.id, definitions)) return false;
    if (!session) return true;
    return canReadReport(session as AppSession, entry.id);
  });
}
