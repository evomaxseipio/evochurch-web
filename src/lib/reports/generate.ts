import "server-only";

import type { AppSession } from "@/lib/auth/app-session";
import { FINANCE_READ_PERMISSIONS } from "@/lib/auth/permission-keys";
import { hasAnyPermission } from "@/lib/auth/permissions";
import type { Locale } from "@/i18n/config";
import { canExportReport, canReadReport } from "@/lib/reports/permissions";
import { reportDownloadFilename } from "@/lib/reports/filenames";
import {
  generateExecutiveMonthlySummaryPdf,
} from "@/lib/reports/generators/executive-monthly-summary";
import {
  generateFinancialByFundPdf,
  generateFinancialByFundXlsx,
  generateFinancialByMemberPdf,
  generateFinancialByMemberXlsx,
  generateFinancialIncomeExpensePdf,
  generateFinancialIncomeExpenseXlsx,
} from "@/lib/reports/generators/financial-supplementary";
import {
  generateFinancialMonthlyCeadPdf,
  generateFinancialMonthlyCeadXlsx,
} from "@/lib/reports/generators/financial-monthly-cead";
import {
  generateConcilioF001Pdf,
  generateConcilioF001Xlsx,
} from "@/lib/reports/generators/financial-monthly-concilio-f001";
import {
  generateAuditActivityLogPdf,
  generateAuditActivityLogXlsx,
  type AuditActivityLogPayload,
} from "@/lib/reports/generators/audit-activity-log";
import {
  generateMembershipDirectoryPdf,
  generateMembershipDirectoryXlsx,
} from "@/lib/reports/generators/membership-directory";
import { catalogEntryById } from "@/lib/reports/catalog";
import type { MonthPeriod, YearPeriod } from "@/lib/reports/period";
import {
  REPORT_MIME_TYPES,
  type GeneratedReportFile,
  type ReportExportOptions,
  type ReportFormat,
  type ReportId,
  type ReportPeriod,
} from "@/lib/reports/types";
import {
  generateMembershipAnnualCeadPdf,
} from "@/lib/reports/generators/membership-annual-cead";
import { fetchAuditLogPage } from "@/lib/services/audit-log";
import {
  fetchChurchReportMeta,
  fetchExecutiveMonthlyPayload,
  fetchFinancialByFundPayload,
  fetchFinancialByMemberPayload,
  fetchFinancialIncomeExpensePayload,
  fetchFinancialMonthlyPayload,
  fetchConcilioF001Payload,
  fetchMembershipAnnualStatsPayload,
  fetchMembershipDirectoryPayload,
} from "@/lib/services/reports";
import type { SupabaseClient } from "@supabase/supabase-js";

async function churchMeta(
  supabase: SupabaseClient,
  session: AppSession,
) {
  return fetchChurchReportMeta(supabase, session.churchId, {
    churchName: session.churchName ?? undefined,
    pastorName: session.fullName ?? undefined,
  });
}

function assertMonthPeriod(
  period: ReportPeriod | undefined,
  reportId: ReportId,
): MonthPeriod {
  if (period?.kind !== "month") {
    throw new Error(`El reporte ${reportId} requiere un período mensual.`);
  }
  return period;
}

function assertYearPeriod(
  period: ReportPeriod | undefined,
  reportId: ReportId,
): YearPeriod {
  if (period?.kind !== "year") {
    throw new Error(`El reporte ${reportId} requiere un año.`);
  }
  return period;
}

function assertFormatSupported(
  reportId: ReportId,
  format: ReportFormat,
): void {
  const entry = catalogEntryById(reportId);
  if (!entry?.formats.includes(format)) {
    throw new Error(`Formato ${format.toUpperCase()} no disponible para este reporte.`);
  }
}

function requireFinanceRead(session: AppSession): void {
  if (!hasAnyPermission(session, [...FINANCE_READ_PERMISSIONS])) {
    throw new Error("Acceso denegado: se requiere permiso de finanzas.");
  }
}

export async function generateReport(
  supabase: SupabaseClient,
  session: AppSession,
  reportId: ReportId,
  format: ReportFormat,
  period?: ReportPeriod,
  options?: ReportExportOptions,
  access: "preview" | "export" = "export",
  locale: Locale = "es",
): Promise<GeneratedReportFile> {
  if (access === "preview") {
    if (!canReadReport(session, reportId)) {
      throw new Error("Acceso denegado: se requiere permiso de lectura.");
    }
  } else if (!canExportReport(session, reportId)) {
    throw new Error("Acceso denegado: se requiere permiso de exportación.");
  }
  assertFormatSupported(reportId, format);
  const churchId = session.churchId;
  const meta = await churchMeta(supabase, session);

  let data: Uint8Array;
  let filenameBase: string;
  let resolvedPeriod: ReportPeriod | undefined = period;

  switch (reportId) {
    case "financial-monthly-cead": {
      const month = assertMonthPeriod(period, reportId);
      const payload = await fetchFinancialMonthlyPayload(
        supabase,
        churchId,
        month,
        meta,
      );
      data =
        format === "xlsx"
          ? await generateFinancialMonthlyCeadXlsx(payload, locale, session.fullName)
          : await generateFinancialMonthlyCeadPdf(payload, locale, session.fullName);
      filenameBase = "informe-financiero-cead";
      resolvedPeriod = month;
      break;
    }
    case "financial-monthly-concilio-f001": {
      const month = assertMonthPeriod(period, reportId);
      const payload = await fetchConcilioF001Payload(
        supabase,
        churchId,
        month,
        meta,
      );
      data =
        format === "xlsx"
          ? await generateConcilioF001Xlsx(payload, locale)
          : await generateConcilioF001Pdf(payload, locale);
      filenameBase = "informe-financiero-concilio-f001";
      resolvedPeriod = month;
      break;
    }
    case "membership-directory": {
      const payload = await fetchMembershipDirectoryPayload(
        supabase,
        churchId,
        options?.memberFilter ?? "all",
        meta,
      );
      data =
        format === "xlsx"
          ? await generateMembershipDirectoryXlsx(payload, locale)
          : await generateMembershipDirectoryPdf(payload, locale, session.fullName);
      filenameBase = "directorio-miembros";
      resolvedPeriod = undefined;
      break;
    }
    case "membership-annual-cead": {
      const year = assertYearPeriod(period, reportId);
      const payload = await fetchMembershipAnnualStatsPayload(
        supabase,
        churchId,
        year,
        meta,
      );
      data = await generateMembershipAnnualCeadPdf(payload, locale);
      filenameBase = "informe-estadistico-cead";
      resolvedPeriod = year;
      break;
    }
    case "executive-monthly-summary": {
      const month = assertMonthPeriod(period, reportId);
      const payload = await fetchExecutiveMonthlyPayload(
        supabase,
        churchId,
        month,
        meta,
      );
      data = await generateExecutiveMonthlySummaryPdf(payload, locale);
      filenameBase = "resumen-ejecutivo-mensual";
      resolvedPeriod = month;
      break;
    }
    case "financial-income-expense": {
      requireFinanceRead(session);
      const month = assertMonthPeriod(period, reportId);
      const payload = await fetchFinancialIncomeExpensePayload(
        supabase,
        churchId,
        month,
        meta,
      );
      data =
        format === "xlsx"
          ? await generateFinancialIncomeExpenseXlsx(payload, locale)
          : await generateFinancialIncomeExpensePdf(payload, locale);
      filenameBase = "estado-resultados";
      resolvedPeriod = month;
      break;
    }
    case "financial-by-fund": {
      requireFinanceRead(session);
      const month = assertMonthPeriod(period, reportId);
      const payload = await fetchFinancialByFundPayload(
        supabase,
        churchId,
        month,
        meta,
      );
      data =
        format === "xlsx"
          ? await generateFinancialByFundXlsx(payload, locale)
          : await generateFinancialByFundPdf(payload, locale);
      filenameBase = "movimiento-por-fondo";
      resolvedPeriod = month;
      break;
    }
    case "financial-by-member": {
      requireFinanceRead(session);
      const month = assertMonthPeriod(period, reportId);
      const payload = await fetchFinancialByMemberPayload(
        supabase,
        churchId,
        month,
        meta,
      );
      data =
        format === "xlsx"
          ? await generateFinancialByMemberXlsx(payload, locale)
          : await generateFinancialByMemberPdf(payload, locale);
      filenameBase = "contribuciones-por-miembro";
      resolvedPeriod = month;
      break;
    }
    case "audit-activity-log": {
      const auditPage = await fetchAuditLogPage(supabase, churchId, {
        limit: 2000,
        offset: 0,
      });
      const auditPayload: AuditActivityLogPayload = {
        churchName: meta.churchName,
        generatedAt: new Date().toISOString(),
        filters: {},
        items: auditPage.items,
        total: auditPage.total,
      };
      data =
        format === "xlsx"
          ? await generateAuditActivityLogXlsx(auditPayload, locale)
          : await generateAuditActivityLogPdf(auditPayload, locale);
      filenameBase = "bitacora-acciones";
      resolvedPeriod = undefined;
      break;
    }
    case "family-households":
      throw new Error(
        "El reporte de familias se abre desde Reportes → Familias (ruta dedicada).",
      );
    case "tithe-weekly-close":
      throw new Error(
        "El cierre semanal de diezmos se abre desde Reportes → Vista previa (navegación por semana).",
      );
    default:
      throw new Error("Reporte no implementado.");
  }

  return {
    filename: reportDownloadFilename(filenameBase, format, resolvedPeriod, {
      locale,
      includeLocaleSuffix: true,
    }),
    mimeType: REPORT_MIME_TYPES[format],
    data,
  };
}

export { REPORT_MIME_TYPES };
