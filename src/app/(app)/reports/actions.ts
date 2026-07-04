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
import type { MemberFilterKey } from "@/lib/members/types";
import {
  isReportFormat,
  isReportId,
  type ReportFormat,
  type ReportId,
  type ReportPeriod,
} from "@/lib/reports/types";
import {
  fetchFinancialMonthlyPayload,
  fetchConcilioF001Payload,
  type FinancialMonthlyPayload,
  type ConcilioF001ReportPayload,
} from "@/lib/services/reports";
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
    requirePermission(session, reportExportPermission(reportId));
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
