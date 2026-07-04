import { fmtRD } from "@/lib/format-currency";
import type { Locale } from "@/i18n/config";
import {
  buildPdfTablePaginated,
} from "@/lib/reports/export/pdf";
import {
  createWorkbook,
  workbookToBuffer,
} from "@/lib/reports/export/xlsx";
import type {
  FinancialByFundPayload,
  FinancialByMemberPayload,
  FinancialIncomeExpensePayload,
} from "@/lib/services/reports";
import { getTranslations } from "next-intl/server";

export async function generateFinancialIncomeExpenseXlsx(
  payload: FinancialIncomeExpensePayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const workbook = await createWorkbook();
  const sheet = workbook.addWorksheet(tReports("exports.financialIncomeExpense.title"));
  sheet.addRow([tReports("exports.financialIncomeExpense.title"), payload.periodLabel]);
  sheet.addRow([tReports("exports.common.church"), payload.churchName ?? ""]);
  sheet.addRow([tReports("exports.financialIncomeExpense.income"), payload.incomeTotal]);
  sheet.addRow([tReports("exports.financialIncomeExpense.expense"), payload.expenseTotal]);
  sheet.addRow([tReports("exports.financialIncomeExpense.net"), payload.netTotal]);
  sheet.addRow([]);
  sheet.addRow([
    tReports("exports.financialIncomeExpense.columns.month"),
    tReports("exports.financialIncomeExpense.columns.income"),
    tReports("exports.financialIncomeExpense.columns.expense"),
    tReports("exports.financialIncomeExpense.columns.net"),
  ]);
  for (const row of payload.monthlyRows) {
    sheet.addRow([row.label, row.income, row.expense, row.net]);
  }
  return workbookToBuffer(workbook);
}

export async function generateFinancialIncomeExpensePdf(
  payload: FinancialIncomeExpensePayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const rows = payload.monthlyRows.map((row) => [
    row.label,
    fmtRD(row.income),
    fmtRD(row.expense),
    fmtRD(row.net),
  ]);
  rows.push([
    tReports("exports.financialIncomeExpense.periodTotal"),
    fmtRD(payload.incomeTotal),
    fmtRD(payload.expenseTotal),
    fmtRD(payload.netTotal),
  ]);
  return buildPdfTablePaginated(
    tReports("exports.financialIncomeExpense.title"),
    [
      { header: tReports("exports.financialIncomeExpense.columns.month"), width: 120 },
      { header: tReports("exports.financialIncomeExpense.columns.income"), width: 100 },
      { header: tReports("exports.financialIncomeExpense.columns.expense"), width: 100 },
      { header: tReports("exports.financialIncomeExpense.columns.net"), width: 100 },
    ],
    rows,
    `${payload.churchName ?? ""} · ${payload.periodLabel}`,
  );
}

export async function generateFinancialByFundXlsx(
  payload: FinancialByFundPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const workbook = await createWorkbook();
  const sheet = workbook.addWorksheet(tReports("exports.financialByFund.sheet"));
  sheet.addRow([tReports("exports.financialByFund.title"), payload.periodLabel]);
  sheet.addRow([
    tCommon("fund"),
    tReports("exports.financialByFund.columns.periodContributions"),
    tReports("exports.financialByFund.columns.balance"),
    tCommon("active"),
  ]);
  for (const row of payload.rows) {
    sheet.addRow([
      row.fundName,
      row.periodContributions,
      row.balance,
      row.isActive ? tCommon("yes") : tCommon("no"),
    ]);
  }
  return workbookToBuffer(workbook);
}

export async function generateFinancialByFundPdf(
  payload: FinancialByFundPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const rows = payload.rows.map((row) => [
    row.fundName,
    fmtRD(row.periodContributions),
    fmtRD(row.balance),
    row.isActive ? tCommon("yes") : tCommon("no"),
  ]);
  return buildPdfTablePaginated(
    tReports("exports.financialByFund.title"),
    [
      { header: tCommon("fund"), width: 160 },
      { header: tReports("exports.financialByFund.columns.periodContributions"), width: 100 },
      { header: tReports("exports.financialByFund.columns.balance"), width: 100 },
      { header: tCommon("active"), width: 60 },
    ],
    rows,
    `${payload.churchName ?? ""} · ${payload.periodLabel}`,
  );
}

export async function generateFinancialByMemberXlsx(
  payload: FinancialByMemberPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const workbook = await createWorkbook();
  const sheet = workbook.addWorksheet(tReports("exports.financialByMember.sheet"));
  sheet.addRow([tReports("exports.financialByMember.title"), payload.periodLabel]);
  sheet.addRow([
    tReports("exports.financialByMember.columns.member"),
    tReports("cead.incomeLines.tithes"),
    tReports("cead.incomeLines.voluntaryOfferings"),
    tReports("exports.financialByMember.columns.donations"),
    tCommon("total"),
  ]);
  for (const row of payload.rows) {
    sheet.addRow([
      row.name,
      row.tithe,
      row.offering,
      row.donation,
      row.total,
    ]);
  }
  return workbookToBuffer(workbook);
}

export async function generateFinancialByMemberPdf(
  payload: FinancialByMemberPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const rows = payload.rows.map((row) => [
    row.name,
    fmtRD(row.tithe),
    fmtRD(row.offering),
    fmtRD(row.donation),
    fmtRD(row.total),
  ]);
  return buildPdfTablePaginated(
    tReports("exports.financialByMember.title"),
    [
      { header: tReports("exports.financialByMember.columns.member"), width: 160 },
      { header: tReports("cead.incomeLines.tithes"), width: 80 },
      { header: tReports("cead.incomeLines.voluntaryOfferings"), width: 80 },
      { header: tReports("exports.financialByMember.columns.donations"), width: 80 },
      { header: tCommon("total"), width: 80 },
    ],
    rows,
    `${payload.churchName ?? ""} · ${payload.periodLabel} · ${tReports("exports.financialByMember.confidential")}`,
  );
}
