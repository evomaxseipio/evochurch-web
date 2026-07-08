"use server";

import { getActionSession } from "@/lib/auth/app-session";
import { requirePermission } from "@/lib/auth/permissions";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { encodeReportBase64 } from "@/lib/reports/filenames";
import { generateReport } from "@/lib/reports/generate";
import { defaultReportPeriod } from "@/lib/reports/period";
import {
  canExportReport,
  canReadReport,
  reportExportPermission,
} from "@/lib/reports/permissions";
import { canExportAuditLog } from "@/lib/auth/permissions";
import type { MemberFilterKey } from "@/lib/members/types";
import {
  isReportFormat,
  isReportId,
  type ReportFormat,
  type ReportId,
  type ReportPeriod,
} from "@/lib/reports/types";
import {
  fetchChurchReportMeta,
  fetchFinancialMonthlyPayload,
  fetchConcilioF001Payload,
  fetchMembershipDirectoryPayload,
  type FinancialMonthlyPayload,
  type ConcilioF001ReportPayload,
  type MembershipDirectoryPayload,
} from "@/lib/services/reports";
import { submitConcilioReport } from "@/lib/services/org-portal";
import type { MonthPeriod } from "@/lib/reports/period";
import { getTranslations } from "next-intl/server";

export type GenerateReportResult =
  | { ok: true; filename: string; mimeType: string; base64: string }
  | { ok: false; error: string };

export type PreviewFinancialMonthlyCeadResult =
  | { ok: true; payload: FinancialMonthlyPayload; treasurerName: string | null }
  | { ok: false; error: string };

export type PreviewConcilioF001Result =
  | { ok: true; payload: ConcilioF001ReportPayload; treasurerName: string | null }
  | { ok: false; error: string };

export type PreviewMembershipDirectoryResult =
  | { ok: true; payload: MembershipDirectoryPayload; generatedByName: string | null }
  | { ok: false; error: string };

async function runReportGeneration(
  reportId: ReportId,
  format: ReportFormat,
  period: ReportPeriod | null | undefined,
  memberFilter: MemberFilterKey | undefined,
  access: "preview" | "export",
  locale: Locale,
): Promise<GenerateReportResult> {
  const tErrors = await getTranslations({ locale, namespace: "errors" });
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const { supabase, session } = await getActionSession();
  if (!session.churchId) {
    return { ok: false, error: tErrors("noChurch") };
  }
  if (!canReadReport(session, reportId)) {
    return { ok: false, error: tReports("errors.noReadPermission") };
  }
  if (access === "export") {
    if (!canExportReport(session, reportId)) {
      return { ok: false, error: tReports("errors.noExportPermission") };
    }
    if (reportId === "audit-activity-log") {
      if (!canExportAuditLog(session)) {
        return { ok: false, error: tReports("errors.noExportPermission") };
      }
      requirePermission(session, "audit:export");
    } else {
      requirePermission(session, reportExportPermission(reportId));
    }
  }

  const resolvedPeriod = resolvePeriod(reportId, period);
  const file = await generateReport(
    supabase,
    session,
    reportId,
    format,
    resolvedPeriod,
    memberFilter ? { memberFilter } : undefined,
    access,
    locale,
  );

  return {
    ok: true,
    filename: file.filename,
    mimeType: file.mimeType,
    base64: encodeReportBase64(file.data),
  };
}

function resolvePeriod(
  reportId: ReportId,
  period: ReportPeriod | null | undefined,
): ReportPeriod | undefined {
  if (reportId === "membership-directory") return undefined;
  if (period) return period;
  if (reportId === "membership-annual-cead") {
    return defaultReportPeriod("year");
  }
  return defaultReportPeriod("month");
}

export async function generateReportAction(
  reportId: string,
  format: string,
  period?: ReportPeriod | null,
  memberFilter?: MemberFilterKey,
  localeArg?: string,
): Promise<GenerateReportResult> {
  const requestedLocale = localeArg ?? "";
  const locale: Locale = isLocale(requestedLocale)
    ? requestedLocale
    : defaultLocale;
  try {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    const tErrors = await getTranslations({ locale, namespace: "errors" });
    if (!isReportId(reportId)) {
      return { ok: false, error: tReports("errors.unknownReport") };
    }
    if (!isReportFormat(format)) {
      return { ok: false, error: tErrors("invalidFormat") };
    }

    return await runReportGeneration(
      reportId,
      format as ReportFormat,
      period,
      memberFilter,
      "export",
      locale,
    );
  } catch (e) {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : tReports("errors.generateFailedGeneric"),
    };
  }
}

export async function previewFinancialMonthlyCeadAction(
  period?: ReportPeriod | null,
  localeArg?: string,
): Promise<PreviewFinancialMonthlyCeadResult> {
  const requestedLocale = localeArg ?? "";
  const locale: Locale = isLocale(requestedLocale)
    ? requestedLocale
    : defaultLocale;
  try {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    const tErrors = await getTranslations({ locale, namespace: "errors" });
    const { supabase, session } = await getActionSession();
    if (!session.churchId) {
      return { ok: false, error: tErrors("noChurch") };
    }
    if (!canReadReport(session, "financial-monthly-cead")) {
      return { ok: false, error: tReports("errors.noReadPermission") };
    }

    const resolvedPeriod = resolvePeriod("financial-monthly-cead", period);
    if (resolvedPeriod?.kind !== "month") {
      return { ok: false, error: tReports("errors.previewFailedGeneric") };
    }

    const payload = await fetchFinancialMonthlyPayload(
      supabase,
      session.churchId,
      resolvedPeriod,
      {
        churchName: session.churchName ?? undefined,
        pastorName: session.fullName ?? undefined,
      },
    );

    return {
      ok: true,
      payload,
      treasurerName: session.fullName,
    };
  } catch (e) {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : tReports("errors.previewFailedGeneric"),
    };
  }
}

export async function previewConcilioF001Action(
  period?: ReportPeriod | null,
  localeArg?: string,
): Promise<PreviewConcilioF001Result> {
  const requestedLocale = localeArg ?? "";
  const locale: Locale = isLocale(requestedLocale)
    ? requestedLocale
    : defaultLocale;
  try {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    const tErrors = await getTranslations({ locale, namespace: "errors" });
    const { supabase, session } = await getActionSession();
    if (!session.churchId) {
      return { ok: false, error: tErrors("noChurch") };
    }
    if (!canReadReport(session, "financial-monthly-concilio-f001")) {
      return { ok: false, error: tReports("errors.noReadPermission") };
    }

    const resolvedPeriod = resolvePeriod("financial-monthly-concilio-f001", period);
    if (resolvedPeriod?.kind !== "month") {
      return { ok: false, error: tReports("errors.previewFailedGeneric") };
    }

    const payload = await fetchConcilioF001Payload(
      supabase,
      session.churchId,
      resolvedPeriod,
      {
        churchName: session.churchName ?? undefined,
        pastorName: session.fullName ?? undefined,
        treasurerName: session.fullName ?? undefined,
      },
    );

    return {
      ok: true,
      payload,
      treasurerName: session.fullName,
    };
  } catch (e) {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : tReports("errors.previewFailedGeneric"),
    };
  }
}

export async function previewMembershipDirectoryAction(
  memberFilter?: MemberFilterKey,
  localeArg?: string,
): Promise<PreviewMembershipDirectoryResult> {
  const requestedLocale = localeArg ?? "";
  const locale: Locale = isLocale(requestedLocale)
    ? requestedLocale
    : defaultLocale;
  try {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    const tErrors = await getTranslations({ locale, namespace: "errors" });
    const { supabase, session } = await getActionSession();
    if (!session.churchId) {
      return { ok: false, error: tErrors("noChurch") };
    }
    if (!canReadReport(session, "membership-directory")) {
      return { ok: false, error: tReports("errors.noReadPermission") };
    }

    const meta = await fetchChurchReportMeta(supabase, session.churchId, {
      churchName: session.churchName ?? undefined,
    });

    const payload = await fetchMembershipDirectoryPayload(
      supabase,
      session.churchId,
      memberFilter ?? "all",
      meta,
    );

    return {
      ok: true,
      payload,
      generatedByName: session.fullName,
    };
  } catch (e) {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : tReports("errors.previewFailedGeneric"),
    };
  }
}

export async function previewReportAction(
  reportId: string,
  period?: ReportPeriod | null,
  memberFilter?: MemberFilterKey,
  localeArg?: string,
): Promise<GenerateReportResult> {
  const requestedLocale = localeArg ?? "";
  const locale: Locale = isLocale(requestedLocale)
    ? requestedLocale
    : defaultLocale;
  try {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    if (!isReportId(reportId)) {
      return { ok: false, error: tReports("errors.unknownReport") };
    }

    return await runReportGeneration(
      reportId,
      "pdf",
      period,
      memberFilter,
      "preview",
      locale,
    );
  } catch (e) {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : tReports("errors.previewFailedGeneric"),
    };
  }
}

export type SubmitConcilioReportResult =
  | { ok: true; reportId: string }
  | { ok: false; error: string };

export async function submitConcilioReportAction(
  period: MonthPeriod,
  payload: ConcilioF001ReportPayload,
  localeArg?: string,
): Promise<SubmitConcilioReportResult> {
  const requestedLocale = localeArg ?? "";
  const locale: Locale = isLocale(requestedLocale)
    ? requestedLocale
    : defaultLocale;

  try {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    const { supabase, session } = await getActionSession();
    if (!session.churchId) {
      return { ok: false, error: tReports("errors.noChurchAffiliation") };
    }
    if (!canExportReport(session, "financial-monthly-concilio-f001")) {
      return { ok: false, error: tReports("errors.noExportPermission") };
    }

    const reportId = await submitConcilioReport(supabase, {
      churchId: session.churchId,
      periodYear: period.year,
      periodMonth: period.month,
      payload: payload as unknown as Record<string, unknown>,
      reportKind: "concilio_f001",
    });

    return { ok: true, reportId };
  } catch (e) {
    const tReports = await getTranslations({ locale, namespace: "reports" });
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : tReports("errors.submitCouncilFailed"),
    };
  }
}

export async function checkChurchCouncilAffiliationAction(): Promise<{
  affiliated: boolean;
  organizationName: string | null;
}> {
  try {
    const { supabase, session } = await getActionSession();
    if (!session.churchId) {
      return { affiliated: false, organizationName: null };
    }

    const { data, error } = await supabase.rpc("sp_get_church_org_report_rules", {
      p_church_id: session.churchId,
    });
    if (error) return { affiliated: false, organizationName: null };

    const envelope = data as {
      success?: boolean;
      organization_id?: number | null;
      organization_name?: string | null;
    };
    if (!envelope?.success || envelope.organization_id == null) {
      return { affiliated: false, organizationName: null };
    }

    return {
      affiliated: true,
      organizationName:
        typeof envelope.organization_name === "string"
          ? envelope.organization_name
          : null,
    };
  } catch {
    return { affiliated: false, organizationName: null };
  }
}
