import type { Locale } from "@/i18n/config";
import { fmtRD } from "@/lib/format-currency";
import { collectPdfBuffer } from "@/lib/reports/export/pdf";
import {
  createFormPdfDocument,
  drawFormFooter,
  drawFormHeader,
  drawFormNote,
  drawFormTable,
  drawSectionHeading,
  sixColumnFormWidths,
  type PdfFormTableRow,
} from "@/lib/reports/export/pdf-form";
import {
  createWorkbook,
  workbookToBuffer,
} from "@/lib/reports/export/xlsx";
import { f001LineI18nKey } from "@/lib/reports/templates/concilio/f001-label-keys";
import type { ConcilioF001Payload } from "@/lib/reports/templates/concilio/f001-types";
import type { ConcilioF001ReportPayload } from "@/lib/services/reports";
import { getTranslations } from "next-intl/server";
import type ExcelJS from "exceljs";

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

function lineLabel(key: string, t: TranslateFn): string {
  return t(f001LineI18nKey(key));
}

function fmtAmount(value: number): string {
  return fmtRD(value);
}

function buildSectionBDataRows(payload: ConcilioF001Payload, t: TranslateFn): string[][] {
  const maxRows = Math.max(
    payload.sectionB.generalIncome.length,
    payload.sectionB.ministryIncome.length,
    payload.sectionB.churchExpenses.length,
  );
  const rows: string[][] = [];
  for (let i = 0; i < maxRows; i += 1) {
    const general = payload.sectionB.generalIncome[i];
    const ministry = payload.sectionB.ministryIncome[i];
    const expense = payload.sectionB.churchExpenses[i];
    rows.push([
      general ? lineLabel(general.key, t) : "",
      general ? fmtAmount(general.amount) : "",
      ministry ? lineLabel(ministry.key, t) : "",
      ministry ? fmtAmount(ministry.amount) : "",
      expense ? lineLabel(expense.key, t) : "",
      expense ? fmtAmount(expense.amount) : "",
    ]);
  }
  rows.push([
    t("exports.concilioF001.totalGeneralIncome"),
    fmtAmount(payload.sectionB.totals.generalIncome),
    t("exports.concilioF001.totalMinistryIncome"),
    fmtAmount(payload.sectionB.totals.ministryIncome),
    t("exports.concilioF001.totalChurchExpenses"),
    fmtAmount(payload.sectionB.totals.churchExpenses),
  ]);
  return rows;
}

function buildSectionCDataRows(payload: ConcilioF001Payload, t: TranslateFn): string[][] {
  const maxRows = Math.max(
    payload.sectionC.churchToCouncil.length,
    payload.sectionC.ministryToNational.length,
    payload.sectionC.specialContributions.length,
  );
  const rows: string[][] = [];
  for (let i = 0; i < maxRows; i += 1) {
    const church = payload.sectionC.churchToCouncil[i];
    const ministry = payload.sectionC.ministryToNational[i];
    const special = payload.sectionC.specialContributions[i];
    rows.push([
      church ? lineLabel(church.key, t) : "",
      church ? fmtAmount(church.amount) : "",
      ministry ? lineLabel(ministry.key, t) : "",
      ministry ? fmtAmount(ministry.amount) : "",
      special ? lineLabel(special.key, t) : "",
      special ? fmtAmount(special.amount) : "",
    ]);
  }
  rows.push([
    t("exports.concilioF001.subtotalChurchCouncil"),
    fmtAmount(payload.sectionC.subtotals.churchToCouncil),
    t("exports.concilioF001.subtotalMinistryNational"),
    fmtAmount(payload.sectionC.subtotals.ministryToNational),
    t("exports.concilioF001.subtotalSpecialContributions"),
    fmtAmount(payload.sectionC.subtotals.specialContributions),
  ]);
  return rows;
}

export async function generateConcilioF001Pdf(
  payload: ConcilioF001ReportPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const t = await getTranslations({ locale, namespace: "reports" });
  const doc = createFormPdfDocument();
  const bufferPromise = collectPdfBuffer(doc);
  const cols = sixColumnFormWidths(doc);

  drawFormHeader(doc, [
    { text: payload.meta.councilHeader, size: 9 },
    { text: `RNC. 4-01-50833-8 · ${payload.meta.formCode}`, size: 9 },
    { text: t("exports.concilioF001.title").toUpperCase(), size: 13, bold: true },
  ]);

  drawSectionHeading(doc, t("exports.concilioF001.sectionA"));
  drawFormTable(doc, cols, [
    [
      { text: t("exports.concilioF001.presbytery"), style: "label" },
      { text: payload.meta.presbyterio, colSpan: 2 },
      { text: t("exports.concilioF001.presbyter"), style: "label" },
      { text: payload.meta.presbyterName, colSpan: 2 },
    ],
    [
      { text: t("exports.common.pastor"), style: "label" },
      { text: payload.meta.pastorName, colSpan: 2 },
      { text: t("exports.concilioF001.pastorCredential"), style: "label" },
      { text: payload.meta.pastorCredential, colSpan: 2 },
    ],
    [
      { text: t("exports.common.church"), style: "label" },
      { text: payload.meta.churchName, colSpan: 2 },
      { text: t("exports.concilioF001.churchCode"), style: "label" },
      { text: payload.meta.churchCode, colSpan: 2 },
    ],
    [
      { text: t("exports.concilioF001.spouse"), style: "label" },
      { text: payload.meta.spouseName ?? "", colSpan: 2 },
      { text: t("exports.concilioF001.spouseCredential"), style: "label" },
      { text: payload.meta.spouseCredential ?? "", colSpan: 2 },
    ],
    [
      { text: t("exports.concilioF001.month"), style: "label" },
      { text: String(payload.meta.month) },
      { text: t("exports.concilioF001.year"), style: "label" },
      { text: String(payload.meta.year) },
      { text: "", colSpan: 2 },
    ],
  ]);
  doc.moveDown(0.45);

  drawSectionHeading(doc, t("exports.concilioF001.sectionB"));
  const sectionBData = buildSectionBDataRows(payload, t);
  const sectionBTable: PdfFormTableRow[] = [
    [
      { text: t("exports.concilioF001.generalIncomeCol"), colSpan: 2, style: "header" },
      { text: t("exports.concilioF001.ministryIncomeCol"), colSpan: 2, style: "header" },
      { text: t("exports.concilioF001.churchExpensesCol"), colSpan: 2, style: "header" },
    ],
    [
      { text: t("exports.common.concept"), style: "header" },
      { text: t("exports.common.amountRd"), style: "header" },
      { text: t("exports.common.concept"), style: "header" },
      { text: t("exports.common.amountRd"), style: "header" },
      { text: t("exports.common.concept"), style: "header" },
      { text: t("exports.common.amountRd"), style: "header" },
    ],
    ...sectionBData.map((row, index) => {
      const isTotal = index === sectionBData.length - 1;
      return [
        { text: row[0], style: isTotal ? "total" : undefined },
        { text: row[1], style: isTotal ? "totalAmount" : "amount" },
        { text: row[2], style: isTotal ? "total" : undefined },
        { text: row[3], style: isTotal ? "totalAmount" : "amount" },
        { text: row[4], style: isTotal ? "total" : undefined },
        { text: row[5], style: isTotal ? "totalAmount" : "amount" },
      ] satisfies PdfFormTableRow;
    }),
  ];
  drawFormTable(doc, cols, sectionBTable);
  doc.moveDown(0.45);

  drawSectionHeading(doc, t("exports.concilioF001.sectionC"));
  const sectionCData = buildSectionCDataRows(payload, t);
  const sectionCTable: PdfFormTableRow[] = [
    [
      { text: t("exports.concilioF001.churchToCouncilCol"), colSpan: 2, style: "header" },
      { text: t("exports.concilioF001.ministryNationalCol"), colSpan: 2, style: "header" },
      { text: t("exports.concilioF001.specialContributionsCol"), colSpan: 2, style: "header" },
    ],
    ...sectionCData.map((row, index) => {
      const isTotal = index === sectionCData.length - 1;
      return [
        { text: row[0], style: isTotal ? "total" : undefined },
        { text: row[1], style: isTotal ? "totalAmount" : "amount" },
        { text: row[2], style: isTotal ? "total" : undefined },
        { text: row[3], style: isTotal ? "totalAmount" : "amount" },
        { text: row[4], style: isTotal ? "total" : undefined },
        { text: row[5], style: isTotal ? "totalAmount" : "amount" },
      ] satisfies PdfFormTableRow;
    }),
  ];
  drawFormTable(doc, cols, sectionCTable);
  drawFormNote(doc, t("exports.concilioF001.regulationNote"));
  doc.moveDown(0.35);

  drawSectionHeading(doc, t("exports.concilioF001.sectionD"));
  drawFormTable(doc, cols, [
    [
      { text: t("exports.concilioF001.churchBlock"), colSpan: 2, style: "header" },
      { text: t("exports.concilioF001.pastorBlock"), colSpan: 2, style: "header" },
      { text: "", colSpan: 2, style: "header" },
    ],
    [
      { text: t("exports.concilioF001.churchSavings") },
      { text: fmtAmount(payload.sectionD.church.savings), style: "amount" },
      { text: t("exports.concilioF001.pastorSavings") },
      { text: fmtAmount(payload.sectionD.pastor.savings), style: "amount" },
      { text: "", colSpan: 2 },
    ],
    [
      { text: t("exports.concilioF001.churchLoan") },
      { text: fmtAmount(payload.sectionD.church.loanPayment), style: "amount" },
      { text: t("exports.concilioF001.pastorLoan") },
      { text: fmtAmount(payload.sectionD.pastor.loanPayment), style: "amount" },
      { text: "", colSpan: 2 },
    ],
    [
      { text: t("exports.concilioF001.churchFuneralPlan") },
      { text: fmtAmount(payload.sectionD.church.funeralPlan), style: "amount" },
      { text: t("exports.concilioF001.pastorFuneralPlan") },
      { text: fmtAmount(payload.sectionD.pastor.funeralPlan), style: "amount" },
      { text: "", colSpan: 2 },
    ],
    [
      { text: t("exports.concilioF001.totalMovements"), colSpan: 2, style: "total" },
      { text: fmtAmount(payload.sectionD.totalMovements), colSpan: 2, style: "totalAmount" },
      { text: "", colSpan: 2 },
    ],
  ]);

  drawFormFooter(doc, [
    `${t("exports.concilioF001.preparedOn")}: ${payload.signatures.preparedOn ?? ""}`,
    `${t("exports.concilioF001.treasurerSignature")}:`,
    `${t("exports.concilioF001.pastorSignature")}: ${payload.meta.pastorName}`,
  ]);

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

function mergeRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  fromCol: number,
  toCol: number,
) {
  sheet.mergeCells(row, fromCol, row, toCol);
}

export async function generateConcilioF001Xlsx(
  payload: ConcilioF001ReportPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const t = await getTranslations({ locale, namespace: "reports" });
  const workbook = await createWorkbook();
  const sheet = workbook.addWorksheet(t("xlsx.concilioF001Sheet"));

  sheet.getColumn(1).width = 34;
  sheet.getColumn(2).width = 14;
  sheet.getColumn(3).width = 34;
  sheet.getColumn(4).width = 14;
  sheet.getColumn(5).width = 34;
  sheet.getColumn(6).width = 14;

  let r = 1;
  mergeRow(sheet, r, 1, 6);
  setCell(sheet, r, 1, payload.meta.councilHeader, true);
  r += 1;
  mergeRow(sheet, r, 1, 6);
  setCell(sheet, r, 1, `RNC. 4-01-50833-8 · ${payload.meta.formCode}`, true);
  r += 1;
  mergeRow(sheet, r, 1, 6);
  setCell(sheet, r, 1, t("exports.concilioF001.title").toUpperCase(), true);
  r += 1;

  mergeRow(sheet, r, 1, 6);
  setCell(sheet, r, 1, t("exports.concilioF001.sectionA"), true);
  r += 1;
  setCell(sheet, r, 1, t("exports.concilioF001.presbytery"));
  mergeRow(sheet, r, 2, 3);
  setCell(sheet, r, 2, payload.meta.presbyterio);
  setCell(sheet, r, 4, t("exports.concilioF001.presbyter"));
  mergeRow(sheet, r, 5, 6);
  setCell(sheet, r, 5, payload.meta.presbyterName);
  r += 1;
  setCell(sheet, r, 1, t("exports.common.pastor"));
  mergeRow(sheet, r, 2, 3);
  setCell(sheet, r, 2, payload.meta.pastorName);
  setCell(sheet, r, 4, t("exports.concilioF001.pastorCredential"));
  mergeRow(sheet, r, 5, 6);
  setCell(sheet, r, 5, payload.meta.pastorCredential);
  r += 1;
  setCell(sheet, r, 1, t("exports.common.church"));
  mergeRow(sheet, r, 2, 3);
  setCell(sheet, r, 2, payload.meta.churchName);
  setCell(sheet, r, 4, t("exports.concilioF001.churchCode"));
  mergeRow(sheet, r, 5, 6);
  setCell(sheet, r, 5, payload.meta.churchCode);
  r += 1;
  setCell(sheet, r, 1, t("exports.concilioF001.spouse"));
  mergeRow(sheet, r, 2, 3);
  setCell(sheet, r, 2, payload.meta.spouseName ?? "");
  setCell(sheet, r, 4, t("exports.concilioF001.spouseCredential"));
  mergeRow(sheet, r, 5, 6);
  setCell(sheet, r, 5, payload.meta.spouseCredential ?? "");
  r += 1;
  setCell(sheet, r, 5, t("exports.concilioF001.month"));
  setCell(sheet, r, 6, payload.meta.month);
  r += 1;
  setCell(sheet, r, 5, t("exports.concilioF001.year"));
  setCell(sheet, r, 6, payload.meta.year);
  r += 1;

  mergeRow(sheet, r, 1, 6);
  setCell(sheet, r, 1, t("exports.concilioF001.sectionB"), true);
  r += 1;
  setCell(sheet, r, 1, t("exports.concilioF001.generalIncomeCol"), true);
  setCell(sheet, r, 3, t("exports.concilioF001.ministryIncomeCol"), true);
  setCell(sheet, r, 5, t("exports.concilioF001.churchExpensesCol"), true);
  r += 1;

  const maxB = Math.max(
    payload.sectionB.generalIncome.length,
    payload.sectionB.ministryIncome.length,
    payload.sectionB.churchExpenses.length,
  );
  for (let i = 0; i < maxB; i += 1) {
    const general = payload.sectionB.generalIncome[i];
    const ministry = payload.sectionB.ministryIncome[i];
    const expense = payload.sectionB.churchExpenses[i];
    if (general) {
      setCell(sheet, r, 1, lineLabel(general.key, t));
      setCell(sheet, r, 2, general.amount);
    }
    if (ministry) {
      setCell(sheet, r, 3, lineLabel(ministry.key, t));
      setCell(sheet, r, 4, ministry.amount);
    }
    if (expense) {
      setCell(sheet, r, 5, lineLabel(expense.key, t));
      setCell(sheet, r, 6, expense.amount);
    }
    r += 1;
  }
  setCell(sheet, r, 1, t("exports.concilioF001.totalGeneralIncome"), true);
  setCell(sheet, r, 2, payload.sectionB.totals.generalIncome, true);
  setCell(sheet, r, 3, t("exports.concilioF001.totalMinistryIncome"), true);
  setCell(sheet, r, 4, payload.sectionB.totals.ministryIncome, true);
  setCell(sheet, r, 5, t("exports.concilioF001.totalChurchExpenses"), true);
  setCell(sheet, r, 6, payload.sectionB.totals.churchExpenses, true);
  r += 2;

  mergeRow(sheet, r, 1, 6);
  setCell(sheet, r, 1, t("exports.concilioF001.sectionC"), true);
  r += 1;
  setCell(sheet, r, 1, t("exports.concilioF001.churchToCouncilCol"), true);
  setCell(sheet, r, 3, t("exports.concilioF001.ministryNationalCol"), true);
  setCell(sheet, r, 5, t("exports.concilioF001.specialContributionsCol"), true);
  r += 1;

  const maxC = Math.max(
    payload.sectionC.churchToCouncil.length,
    payload.sectionC.ministryToNational.length,
    payload.sectionC.specialContributions.length,
  );
  for (let i = 0; i < maxC; i += 1) {
    const church = payload.sectionC.churchToCouncil[i];
    const ministry = payload.sectionC.ministryToNational[i];
    const special = payload.sectionC.specialContributions[i];
    if (church) {
      setCell(sheet, r, 1, lineLabel(church.key, t));
      setCell(sheet, r, 2, church.amount);
    }
    if (ministry) {
      setCell(sheet, r, 3, lineLabel(ministry.key, t));
      setCell(sheet, r, 4, ministry.amount);
    }
    if (special) {
      setCell(sheet, r, 5, lineLabel(special.key, t));
      setCell(sheet, r, 6, special.amount);
    }
    r += 1;
  }
  setCell(sheet, r, 1, t("exports.concilioF001.subtotalChurchCouncil"), true);
  setCell(sheet, r, 2, payload.sectionC.subtotals.churchToCouncil, true);
  setCell(sheet, r, 3, t("exports.concilioF001.subtotalMinistryNational"), true);
  setCell(sheet, r, 4, payload.sectionC.subtotals.ministryToNational, true);
  setCell(sheet, r, 5, t("exports.concilioF001.subtotalSpecialContributions"), true);
  setCell(sheet, r, 6, payload.sectionC.subtotals.specialContributions, true);
  r += 2;

  mergeRow(sheet, r, 1, 6);
  setCell(sheet, r, 1, t("exports.concilioF001.sectionD"), true);
  r += 1;
  setCell(sheet, r, 1, t("exports.concilioF001.churchBlock"), true);
  setCell(sheet, r, 3, t("exports.concilioF001.pastorBlock"), true);
  r += 1;
  setCell(sheet, r, 1, t("exports.concilioF001.churchSavings"));
  setCell(sheet, r, 2, payload.sectionD.church.savings);
  setCell(sheet, r, 3, t("exports.concilioF001.pastorSavings"));
  setCell(sheet, r, 4, payload.sectionD.pastor.savings);
  r += 1;
  setCell(sheet, r, 1, t("exports.concilioF001.churchLoan"));
  setCell(sheet, r, 2, payload.sectionD.church.loanPayment);
  setCell(sheet, r, 3, t("exports.concilioF001.pastorLoan"));
  setCell(sheet, r, 4, payload.sectionD.pastor.loanPayment);
  r += 1;
  setCell(sheet, r, 1, t("exports.concilioF001.churchFuneralPlan"));
  setCell(sheet, r, 2, payload.sectionD.church.funeralPlan);
  setCell(sheet, r, 3, t("exports.concilioF001.pastorFuneralPlan"));
  setCell(sheet, r, 4, payload.sectionD.pastor.funeralPlan);
  r += 1;
  setCell(sheet, r, 1, t("exports.concilioF001.totalMovements"), true);
  setCell(sheet, r, 2, payload.sectionD.totalMovements, true);
  r += 2;
  setCell(sheet, r, 1, t("exports.concilioF001.preparedOn"));
  setCell(sheet, r, 2, payload.signatures.preparedOn ?? "");
  setCell(sheet, r, 4, t("exports.concilioF001.treasurerSignature"));
  setCell(sheet, r, 6, t("exports.concilioF001.pastorSignature"));

  for (const col of [2, 4, 6]) {
    sheet.getColumn(col).numFmt = "#,##0.00";
  }

  return workbookToBuffer(workbook);
}
