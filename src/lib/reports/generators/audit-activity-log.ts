import type { Locale } from "@/i18n/config";
import {
  auditActionLabel,
  auditModuleLabel,
  resolveAuditSummary,
} from "@/lib/audit/labels";
import type { AuditLogEntry } from "@/lib/audit/types";
import { buildPdfTablePaginated } from "@/lib/reports/export/pdf";
import {
  createWorkbook,
  workbookToBuffer,
} from "@/lib/reports/export/xlsx";
import { getTranslations } from "next-intl/server";

export type AuditActivityLogPayload = {
  churchName?: string;
  generatedAt: string;
  filters: {
    from?: string | null;
    to?: string | null;
    module?: string | null;
    action?: string | null;
    search?: string | null;
  };
  items: AuditLogEntry[];
  total: number;
};

const PDF_ROWS_PER_PAGE = 28;

function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function rowSummary(
  entry: AuditLogEntry,
  tAudit: (key: string, values?: Record<string, string | number | Date>) => string,
): string {
  return resolveAuditSummary(entry, tAudit);
}

export async function generateAuditActivityLogXlsx(
  payload: AuditActivityLogPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tAudit = await getTranslations({ locale, namespace: "audit" });
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const workbook = await createWorkbook();

  const meta = workbook.addWorksheet(tReports("xlsx.metaSheet"));
  meta.addRow([tAudit("title"), payload.churchName ?? ""]);
  meta.addRow([tReports("xlsx.generatedAt"), payload.generatedAt]);
  meta.addRow([tCommon("total"), payload.total]);

  const sheet = workbook.addWorksheet(tAudit("exportFilename"));
  sheet.addRow([
    tAudit("columns.date"),
    tAudit("columns.actor"),
    tAudit("columns.module"),
    tAudit("columns.action"),
    tAudit("columns.summary"),
    tAudit("columns.entityId"),
  ]);
  sheet.getRow(1).font = { bold: true };

  for (const entry of payload.items) {
    sheet.addRow([
      formatDateTime(entry.createdAt, locale),
      entry.actorDisplayName,
      auditModuleLabel(entry.module, tAudit),
      auditActionLabel(entry.action, tAudit),
      rowSummary(entry, tAudit),
      entry.entityId ?? "",
    ]);
  }

  return workbookToBuffer(workbook);
}

export async function generateAuditActivityLogPdf(
  payload: AuditActivityLogPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tAudit = await getTranslations({ locale, namespace: "audit" });

  const headers = [
    tAudit("columns.date"),
    tAudit("columns.actor"),
    tAudit("columns.module"),
    tAudit("columns.action"),
    tAudit("columns.summary"),
  ];

  const rows = payload.items.map((entry) => [
    formatDateTime(entry.createdAt, locale),
    entry.actorDisplayName,
    auditModuleLabel(entry.module, tAudit),
    auditActionLabel(entry.action, tAudit),
    rowSummary(entry, tAudit),
  ]);

  const subtitleParts = [
    payload.churchName,
    payload.filters.from || payload.filters.to
      ? `${payload.filters.from ?? "…"} – ${payload.filters.to ?? "…"}`
      : null,
    `${payload.total} rows`,
  ].filter(Boolean);

  const columns = headers.map((header) => ({ header, width: 72 }));

  return buildPdfTablePaginated(
    tAudit("title"),
    columns,
    rows,
    subtitleParts.join(" · "),
    PDF_ROWS_PER_PAGE,
  );
}
