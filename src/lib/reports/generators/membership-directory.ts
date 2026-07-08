import type { Locale } from "@/i18n/config";
import { collectPdfBuffer } from "@/lib/reports/export/pdf";
import {
  createMembershipDirectoryPdfDocument,
  renderMembershipDirectoryFormPdf,
} from "@/lib/reports/export/membership-directory-form-pdf";
import {
  createWorkbook,
  workbookToBuffer,
} from "@/lib/reports/export/xlsx";
import {
  DIRECTORY_COLUMN_KEYS,
  memberDirectoryRow,
  sortMembersByName,
} from "@/lib/reports/templates/membership/directory-helpers";
import type { MembershipDirectoryPayload } from "@/lib/services/reports";
import { getTranslations } from "next-intl/server";
import type ExcelJS from "exceljs";

function setCell(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: string | number | null | undefined,
  bold = false,
) {
  const cell = sheet.getCell(row, col);
  cell.value = value ?? "";
  if (bold) cell.font = { bold: true };
}

function mergeRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  fromCol: number,
  toCol: number,
) {
  sheet.mergeCells(row, fromCol, row, toCol);
}

export async function generateMembershipDirectoryXlsx(
  payload: MembershipDirectoryPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const yesLabel = tReports("preview.membershipDirectory.yes");
  const noLabel = tReports("preview.membershipDirectory.no");
  const workbook = await createWorkbook();
  const memberFilterLabel = tReports(`memberFilters.${payload.filter}`);
  const meta = workbook.addWorksheet(tReports("xlsx.metaSheet"));
  meta.addRow([tReports("xlsx.filter"), memberFilterLabel]);
  meta.addRow([tCommon("total"), payload.stats.total]);
  meta.addRow([tReports("memberFilters.members"), payload.stats.members]);
  meta.addRow([tReports("memberFilters.visits"), payload.stats.visits]);
  meta.addRow([tCommon("active"), payload.stats.active]);
  meta.addRow([tCommon("inactive"), payload.stats.inactive]);
  meta.addRow([tReports("xlsx.generatedAt"), payload.generatedAt]);

  const sheet = workbook.addWorksheet(tReports("xlsx.directorySheet"));
  sheet.addRow(
    DIRECTORY_COLUMN_KEYS.map((key) =>
      tReports(`exports.membershipDirectory.columns.${key}`),
    ),
  );
  sheet.getRow(1).font = { bold: true };
  for (const member of sortMembersByName(payload.members)) {
    sheet.addRow(memberDirectoryRow(member, yesLabel, noLabel));
  }

  return workbookToBuffer(workbook);
}

export async function generateMembershipDirectoryPdf(
  payload: MembershipDirectoryPayload,
  locale: Locale,
  generatedByName?: string | null,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const doc = createMembershipDirectoryPdfDocument();
  const bufferPromise = collectPdfBuffer(doc);

  renderMembershipDirectoryFormPdf(doc, payload, locale, tReports, generatedByName);

  doc.end();
  const buffer = await bufferPromise;
  return new Uint8Array(buffer);
}
