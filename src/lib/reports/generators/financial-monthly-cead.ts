import { fmtRD } from "@/lib/format-currency";
import type { Locale } from "@/i18n/config";
import {
  buildPdfTablePaginated,
} from "@/lib/reports/export/pdf";
import {
  createWorkbook,
  workbookToBuffer,
} from "@/lib/reports/export/xlsx";
import type { FinancialMonthlyPayload } from "@/lib/services/reports";
import {
  CEAD_COUNCIL_FORMULA_I18N_KEYS,
  CEAD_COUNCIL_SEND_I18N_KEYS,
  CEAD_EXPENSE_LINE_I18N_KEYS,
  CEAD_INCOME_LINE_I18N_KEYS,
} from "@/lib/reports/templates/cead/constants";
import { getTranslations } from "next-intl/server";

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

function translateLineLabel(label: string, tReports: TranslateFn) {
  const incomeKey = CEAD_INCOME_LINE_I18N_KEYS[label as keyof typeof CEAD_INCOME_LINE_I18N_KEYS];
  if (incomeKey) return tReports(incomeKey);
  const expenseKey = CEAD_EXPENSE_LINE_I18N_KEYS[label as keyof typeof CEAD_EXPENSE_LINE_I18N_KEYS];
  if (expenseKey) return tReports(expenseKey);
  const councilKey = CEAD_COUNCIL_SEND_I18N_KEYS[label as keyof typeof CEAD_COUNCIL_SEND_I18N_KEYS];
  if (councilKey) return tReports(councilKey);
  return label;
}

function translateFormula(formula: string | undefined, tReports: TranslateFn) {
  if (!formula) return "";
  const key = CEAD_COUNCIL_FORMULA_I18N_KEYS[formula];
  return key ? tReports(key) : formula;
}

export async function generateFinancialMonthlyCeadXlsx(
  payload: FinancialMonthlyPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const workbook = await createWorkbook();
  const sheet = workbook.addWorksheet(tReports("xlsx.financialCeadSheet"));

  sheet.addRow([tReports("exports.financialMonthlyCead.title").toUpperCase()]);
  sheet.addRow([tReports("exports.common.church"), payload.churchName ?? ""]);
  sheet.addRow([tReports("period"), payload.cead.periodLabel]);
  sheet.addRow([tReports("exports.common.pastor"), payload.pastorName ?? "N/D"]);
  sheet.addRow([tReports("exports.common.presbytery"), payload.presbyterio ?? "N/D"]);
  sheet.addRow([]);

  sheet.addRow([tReports("exports.financialMonthlyCead.sectionIncome")]);
  sheet.addRow([tReports("exports.common.concept"), tReports("exports.common.amountRd")]);
  for (const line of payload.cead.incomeLines) {
    sheet.addRow([translateLineLabel(line.label, tReports), line.amount]);
  }
  sheet.addRow([tReports("exports.financialMonthlyCead.totalIncome"), payload.cead.totalIncome]);

  sheet.addRow([]);
  sheet.addRow([tReports("exports.financialMonthlyCead.sectionExpense")]);
  sheet.addRow([tReports("exports.common.concept"), tReports("exports.common.amountRd")]);
  for (const line of payload.cead.expenseLines) {
    sheet.addRow([translateLineLabel(line.label, tReports), line.amount]);
  }
  sheet.addRow([tReports("exports.financialMonthlyCead.totalExpense"), payload.cead.totalExpense]);

  sheet.addRow([]);
  sheet.addRow([tReports("exports.financialMonthlyCead.sectionCouncil")]);
  sheet.addRow([
    tReports("exports.common.concept"),
    tReports("exports.common.amountRd"),
    tReports("exports.common.note"),
  ]);
  for (const line of payload.cead.councilLines) {
    sheet.addRow([
      translateLineLabel(line.label, tReports),
      line.amount,
      translateFormula(line.formula, tReports),
    ]);
  }

  sheet.addRow([]);
  sheet.addRow([tReports("exports.financialMonthlyCead.netBalance"), payload.cead.netBalance]);
  sheet.getColumn(2).numFmt = "#,##0.00";

  return workbookToBuffer(workbook);
}

export async function generateFinancialMonthlyCeadPdf(
  payload: FinancialMonthlyPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const rows: string[][] = [
    ...payload.cead.incomeLines.map((line) => [
      translateLineLabel(line.label, tReports),
      fmtRD(line.amount),
    ]),
    [tReports("exports.financialMonthlyCead.totalIncome"), fmtRD(payload.cead.totalIncome)],
    ["", ""],
    ...payload.cead.expenseLines.map((line) => [
      translateLineLabel(line.label, tReports),
      fmtRD(line.amount),
    ]),
    [tReports("exports.financialMonthlyCead.totalExpense"), fmtRD(payload.cead.totalExpense)],
    ["", ""],
    ...payload.cead.councilLines.map((line) => [
      translateLineLabel(line.label, tReports),
      fmtRD(line.amount),
      translateFormula(line.formula, tReports),
    ]),
    [tReports("exports.financialMonthlyCead.netBalance"), fmtRD(payload.cead.netBalance), ""],
  ];

  return buildPdfTablePaginated(
    tReports("exports.financialMonthlyCead.title"),
    [
      { header: tReports("exports.common.concept"), width: 220 },
      { header: tReports("exports.common.amount"), width: 100 },
      { header: tReports("exports.common.note"), width: 160 },
    ],
    rows,
    `${payload.churchName ?? ""} · ${payload.cead.periodLabel}`,
  );
}
