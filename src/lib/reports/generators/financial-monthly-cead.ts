import type { Locale } from "@/i18n/config";
import { FUENTE_INAGOTABLE } from "@/lib/brand";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";
import { collectPdfBuffer } from "@/lib/reports/export/pdf";
import { renderCeadMonthlyFormPdf } from "@/lib/reports/export/cead-monthly-form-pdf";
import { createFormPdfDocument } from "@/lib/reports/export/pdf-form";
import {
  createWorkbook,
  workbookToBuffer,
} from "@/lib/reports/export/xlsx";
import {
  CEAD_COUNCIL_PERCENT,
  councilCalculationBaseAmount,
  councilCalculationBaseLabel,
  councilFormulaDetail,
  translateCeadLineLabel,
} from "@/lib/reports/templates/cead/form-helpers";
import type { FinancialMonthlyPayload } from "@/lib/services/reports";
import { getTranslations } from "next-intl/server";
import type ExcelJS from "exceljs";

export async function generateFinancialMonthlyCeadPdf(
  payload: FinancialMonthlyPayload,
  locale: Locale,
  treasurerName?: string | null,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const doc = createFormPdfDocument();
  const bufferPromise = collectPdfBuffer(doc);

  renderCeadMonthlyFormPdf(doc, payload, locale, tReports, treasurerName);

  doc.end();
  const buffer = await bufferPromise;
  return new Uint8Array(buffer);
}

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

function mergeRow(sheet: ExcelJS.Worksheet, row: number, fromCol: number, toCol: number) {
  sheet.mergeCells(row, fromCol, row, toCol);
}

export async function generateFinancialMonthlyCeadXlsx(
  payload: FinancialMonthlyPayload,
  locale: Locale,
  treasurerName?: string | null,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const { cead } = payload;
  const councilTotal = cead.councilLines.reduce((sum, line) => sum + line.amount, 0);
  const churchDisplay =
    payload.churchName?.trim() || FUENTE_INAGOTABLE.churchDisplayName;
  const treasurerDisplay = treasurerName?.trim() || "-";
  const generatedLabel = formatDateTime(payload.generatedAt, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const workbook = await createWorkbook();
  const sheet = workbook.addWorksheet(tReports("xlsx.financialCeadSheet"));

  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 28;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 28;

  let r = 1;
  mergeRow(sheet, r, 1, 5);
  setCell(sheet, r, 1, tReports("preview.ceadMonthly.title"), true);
  r += 1;
  mergeRow(sheet, r, 1, 5);
  setCell(sheet, r, 1, churchDisplay, true);
  r += 1;
  setCell(sheet, r, 1, cead.periodLabel);
  setCell(sheet, r, 3, `${tReports("preview.ceadMonthly.pastor")}: ${payload.pastorName ?? "-"}`);
  setCell(sheet, r, 5, `${tReports("preview.ceadMonthly.generatedAt")}: ${generatedLabel}`);
  r += 1;
  setCell(sheet, r, 5, `${tReports("preview.ceadMonthly.treasurer")}: ${treasurerDisplay}`);
  r += 2;

  setCell(sheet, r, 1, tReports("preview.ceadMonthly.kpiTotalIncome"), true);
  setCell(sheet, r, 2, cead.totalIncome);
  setCell(sheet, r, 3, tReports("preview.ceadMonthly.kpiTotalExpense"), true);
  setCell(sheet, r, 4, cead.totalExpense);
  r += 1;
  setCell(sheet, r, 1, tReports("preview.ceadMonthly.kpiNetBalance"), true);
  setCell(sheet, r, 2, cead.netBalance);
  setCell(sheet, r, 3, tReports("preview.ceadMonthly.kpiCouncilSends"), true);
  setCell(sheet, r, 4, councilTotal);
  r += 2;

  mergeRow(sheet, r, 1, 2);
  setCell(sheet, r, 1, tReports("preview.ceadMonthly.sectionIncome"), true);
  mergeRow(sheet, r, 3, 4);
  setCell(sheet, r, 3, tReports("preview.ceadMonthly.sectionExpense"), true);
  r += 1;
  setCell(sheet, r, 1, tReports("preview.ceadMonthly.concept"), true);
  setCell(sheet, r, 2, tReports("preview.ceadMonthly.amountRd"), true);
  setCell(sheet, r, 3, tReports("preview.ceadMonthly.concept"), true);
  setCell(sheet, r, 4, tReports("preview.ceadMonthly.amountRd"), true);
  r += 1;

  const maxLedger = Math.max(cead.incomeLines.length, cead.expenseLines.length);
  for (let i = 0; i < maxLedger; i += 1) {
    const income = cead.incomeLines[i];
    const expense = cead.expenseLines[i];
    if (income) {
      setCell(sheet, r, 1, translateCeadLineLabel(income.label, tReports));
      setCell(sheet, r, 2, income.amount);
    }
    if (expense) {
      setCell(sheet, r, 3, translateCeadLineLabel(expense.label, tReports));
      setCell(sheet, r, 4, expense.amount);
    }
    r += 1;
  }
  setCell(sheet, r, 1, tReports("preview.ceadMonthly.totalIncome"), true);
  setCell(sheet, r, 2, cead.totalIncome, true);
  setCell(sheet, r, 3, tReports("preview.ceadMonthly.totalExpense"), true);
  setCell(sheet, r, 4, cead.totalExpense, true);
  r += 2;

  mergeRow(sheet, r, 1, 5);
  setCell(sheet, r, 1, tReports("preview.ceadMonthly.sectionCouncil"), true);
  r += 1;
  setCell(sheet, r, 1, tReports("preview.ceadMonthly.destination"), true);
  setCell(sheet, r, 2, tReports("preview.ceadMonthly.percentage"), true);
  setCell(sheet, r, 3, tReports("preview.ceadMonthly.calculationBase"), true);
  setCell(sheet, r, 4, tReports("preview.ceadMonthly.amountRd"), true);
  setCell(sheet, r, 5, tReports("preview.ceadMonthly.formula"), true);
  r += 1;

  for (const line of cead.councilLines) {
    setCell(sheet, r, 1, translateCeadLineLabel(line.label, tReports));
    setCell(sheet, r, 2, CEAD_COUNCIL_PERCENT[line.label as keyof typeof CEAD_COUNCIL_PERCENT] ?? "");
    setCell(
      sheet,
      r,
      3,
      `${councilCalculationBaseLabel(line, payload, tReports)}: ${formatCurrency(councilCalculationBaseAmount(line, payload), locale)}`,
    );
    setCell(sheet, r, 4, line.amount);
    setCell(sheet, r, 5, councilFormulaDetail(line, payload, locale, tReports));
    r += 1;
  }
  setCell(sheet, r, 1, tReports("preview.ceadMonthly.totalCouncilSends"), true);
  mergeRow(sheet, r, 1, 3);
  setCell(sheet, r, 4, councilTotal, true);
  r += 2;

  mergeRow(sheet, r, 1, 5);
  setCell(sheet, r, 1, tReports("preview.ceadMonthly.importantNotes"), true);
  r += 1;
  mergeRow(sheet, r, 1, 5);
  setCell(sheet, r, 1, tReports("preview.ceadMonthly.notesBodyLine1"));
  r += 1;
  mergeRow(sheet, r, 1, 5);
  setCell(sheet, r, 1, tReports("preview.ceadMonthly.notesBodyLine2"));
  r += 2;

  mergeRow(sheet, r, 1, 2);
  setCell(sheet, r, 1, `${tReports("preview.ceadMonthly.generatedAt")}: ${generatedLabel}`);
  setCell(sheet, r, 3, tReports("preview.ceadMonthly.pageOf", { page: 1, total: 1 }));
  mergeRow(sheet, r, 4, 5);
  setCell(sheet, r, 4, `${tReports("preview.ceadMonthly.treasurer")}: ${treasurerDisplay}`);

  sheet.getColumn(2).numFmt = "#,##0.00";
  sheet.getColumn(4).numFmt = "#,##0.00";

  return workbookToBuffer(workbook);
}
