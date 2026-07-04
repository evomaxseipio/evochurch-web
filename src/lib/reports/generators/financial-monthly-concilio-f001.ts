import type { Locale } from "@/i18n/config";
import { fmtRD } from "@/lib/format-currency";
import { buildPdfKeyValueForm } from "@/lib/reports/export/pdf";
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

function sectionBRows(payload: ConcilioF001Payload, t: TranslateFn): string[][] {
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

function sectionCRows(payload: ConcilioF001Payload, t: TranslateFn): string[][] {
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

  const sections: {
    heading?: string;
    rows: { label: string; value: string }[];
  }[] = [
    {
      heading: t("exports.concilioF001.sectionA"),
      rows: [
        { label: t("exports.concilioF001.presbytery"), value: payload.meta.presbyterio },
        { label: t("exports.concilioF001.presbyter"), value: payload.meta.presbyterName },
        { label: t("exports.common.pastor"), value: payload.meta.pastorName },
        {
          label: t("exports.concilioF001.pastorCredential"),
          value: payload.meta.pastorCredential,
        },
        { label: t("exports.common.church"), value: payload.meta.churchName },
        { label: t("exports.concilioF001.churchCode"), value: payload.meta.churchCode },
        { label: t("exports.concilioF001.spouse"), value: payload.meta.spouseName ?? "—" },
        { label: t("exports.concilioF001.period"), value: payload.periodLabel },
      ],
    },
    {
      heading: t("exports.concilioF001.sectionB"),
      rows: sectionBRows(payload, t).flatMap((row) => [
        {
          label: `${row[0]} | ${row[2]} | ${row[4]}`,
          value: `${row[1]} | ${row[3]} | ${row[5]}`,
        },
      ]),
    },
    {
      heading: t("exports.concilioF001.sectionC"),
      rows: sectionCRows(payload, t).flatMap((row) => [
        {
          label: `${row[0]} | ${row[2]} | ${row[4]}`,
          value: `${row[1]} | ${row[3]} | ${row[5]}`,
        },
      ]),
    },
    {
      heading: t("exports.concilioF001.sectionD"),
      rows: [
        {
          label: t("exports.concilioF001.churchSavings"),
          value: fmtAmount(payload.sectionD.church.savings),
        },
        {
          label: t("exports.concilioF001.churchLoan"),
          value: fmtAmount(payload.sectionD.church.loanPayment),
        },
        {
          label: t("exports.concilioF001.churchFuneralPlan"),
          value: fmtAmount(payload.sectionD.church.funeralPlan),
        },
        {
          label: t("exports.concilioF001.pastorSavings"),
          value: fmtAmount(payload.sectionD.pastor.savings),
        },
        {
          label: t("exports.concilioF001.pastorLoan"),
          value: fmtAmount(payload.sectionD.pastor.loanPayment),
        },
        {
          label: t("exports.concilioF001.pastorFuneralPlan"),
          value: fmtAmount(payload.sectionD.pastor.funeralPlan),
        },
        {
          label: t("exports.concilioF001.totalMovements"),
          value: fmtAmount(payload.sectionD.totalMovements),
        },
      ],
    },
  ];

  return buildPdfKeyValueForm(
    t("exports.concilioF001.title"),
    `${payload.meta.churchName} · ${payload.periodLabel} · ${payload.meta.formCode}`,
    sections,
    t("exports.concilioF001.regulationNote"),
  );
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
