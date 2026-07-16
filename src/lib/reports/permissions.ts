import type { PermissionKey } from "@/lib/auth/permission-keys";
import {
  canExportAuditLog,
  canReadAuditLog,
  canReadMembers,
  hasAnyPermission,
  hasPermission,
} from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/app-session";
import type { ReportId } from "@/lib/reports/types";

const AUDIT_ACTIVITY_LOG_REPORT_ID = "audit-activity-log" as const;
const FAMILY_HOUSEHOLDS_REPORT_ID = "family-households" as const;
const TITHE_WEEKLY_CLOSE_REPORT_ID = "tithe-weekly-close" as const;

function isAuditActivityLogReport(reportId: ReportId): boolean {
  return reportId === AUDIT_ACTIVITY_LOG_REPORT_ID;
}

function isFamilyHouseholdsReport(reportId: ReportId): boolean {
  return reportId === FAMILY_HOUSEHOLDS_REPORT_ID;
}

function isTitheWeeklyCloseReport(reportId: ReportId): boolean {
  return reportId === TITHE_WEEKLY_CLOSE_REPORT_ID;
}

export function canReadTitheWeeklyClose(session: AppSession): boolean {
  return hasPermission(session, "finances:tithe_close:read");
}

export function canCloseTitheWeeklyClose(session: AppSession): boolean {
  return hasPermission(session, "finances:tithe_close:write");
}

/** Recursos en BD (snake_case) — una fila por reporte en la matriz de permisos. */
export const REPORT_RESOURCE_DEFS = [
  {
    key: "financial_monthly_cead",
    label: "Informe financiero mensual CEAD",
    reportId: "financial-monthly-cead",
  },
  {
    key: "financial_monthly_concilio_f001",
    label: "Informe financiero mensual (CONCILIO) F.001",
    reportId: "financial-monthly-concilio-f001",
  },
  {
    key: "membership_directory",
    label: "Directorio de miembros",
    reportId: "membership-directory",
  },
  {
    key: "membership_annual_cead",
    label: "Informe estadístico anual CEAD",
    reportId: "membership-annual-cead",
  },
  {
    key: "executive_monthly_summary",
    label: "Resumen ejecutivo mensual",
    reportId: "executive-monthly-summary",
  },
  {
    key: "financial_income_expense",
    label: "Estado de resultados",
    reportId: "financial-income-expense",
  },
  {
    key: "financial_by_fund",
    label: "Movimiento por fondo",
    reportId: "financial-by-fund",
  },
  {
    key: "financial_by_member",
    label: "Contribuciones por miembro",
    reportId: "financial-by-member",
  },
] as const;

export type ReportResourceKey =
  (typeof REPORT_RESOURCE_DEFS)[number]["key"];

const REPORT_ID_BY_RESOURCE = Object.fromEntries(
  REPORT_RESOURCE_DEFS.map((def) => [def.key, def.reportId]),
) as Record<ReportResourceKey, ReportId>;

const RESOURCE_BY_REPORT_ID = Object.fromEntries(
  REPORT_RESOURCE_DEFS.map((def) => [def.reportId, def.key]),
) as Record<ReportId, ReportResourceKey>;

export function reportResourceKey(reportId: ReportId): ReportResourceKey {
  return RESOURCE_BY_REPORT_ID[reportId];
}

export function reportIdFromResource(resource: ReportResourceKey): ReportId {
  return REPORT_ID_BY_RESOURCE[resource];
}

export function reportPermissionKey(
  resource: ReportResourceKey,
  action: "read" | "export",
): PermissionKey {
  return `reports:${resource}:${action}` as PermissionKey;
}

export function reportReadPermission(reportId: ReportId): PermissionKey {
  return reportPermissionKey(reportResourceKey(reportId), "read");
}

export function reportExportPermission(reportId: ReportId): PermissionKey {
  return reportPermissionKey(reportResourceKey(reportId), "export");
}

export const REPORT_READ_PERMISSIONS = REPORT_RESOURCE_DEFS.map((def) =>
  reportPermissionKey(def.key, "read"),
);

export const REPORT_EXPORT_PERMISSIONS = REPORT_RESOURCE_DEFS.map((def) =>
  reportPermissionKey(def.key, "export"),
);

export const ALL_REPORT_PERMISSIONS = [
  ...REPORT_READ_PERMISSIONS,
  ...REPORT_EXPORT_PERMISSIONS,
] as const;

export function canAccessReportsHub(session: AppSession): boolean {
  return (
    hasAnyPermission(session, [...REPORT_READ_PERMISSIONS]) ||
    canReadAuditLog(session) ||
    canReadMembers(session) ||
    canReadTitheWeeklyClose(session)
  );
}

export function canReadReport(
  session: AppSession,
  reportId: ReportId,
): boolean {
  if (isAuditActivityLogReport(reportId)) {
    return canReadAuditLog(session);
  }
  if (isFamilyHouseholdsReport(reportId)) {
    return canReadMembers(session);
  }
  if (isTitheWeeklyCloseReport(reportId)) {
    return canReadTitheWeeklyClose(session);
  }
  return hasPermission(session, reportReadPermission(reportId));
}

export function canExportReport(
  session: AppSession,
  reportId: ReportId,
): boolean {
  if (isAuditActivityLogReport(reportId)) {
    return canExportAuditLog(session);
  }
  if (isFamilyHouseholdsReport(reportId)) {
    return canReadMembers(session);
  }
  if (isTitheWeeklyCloseReport(reportId)) {
    return canReadTitheWeeklyClose(session);
  }
  return hasPermission(session, reportExportPermission(reportId));
}

export function reportResourceLabel(resourceKey: string): string {
  return (
    REPORT_RESOURCE_DEFS.find((def) => def.key === resourceKey)?.label ??
    resourceKey
  );
}
