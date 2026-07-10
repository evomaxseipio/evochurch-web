import type { Locale } from "@/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import {
  CEAD_COUNCIL_PERCENT,
  CEAD_COUNCIL_SEND_I18N_KEYS,
  CEAD_EXPENSE_LINE_I18N_KEYS,
  CEAD_INCOME_LINE_I18N_KEYS,
} from "@/lib/reports/templates/cead/constants";
import type { CeadCouncilSendLine } from "@/lib/reports/templates/cead/financial-monthly";
import type { FinancialMonthlyPayload } from "@/lib/services/reports";

export { CEAD_CHART_SCALE, CEAD_COUNCIL_PERCENT } from "@/lib/reports/templates/cead/constants";

/** Alias usado en componentes de preview / impresión. */
export const COUNCIL_PERCENT: Record<string, string> = {
  ...CEAD_COUNCIL_PERCENT,
};

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

function formatFormulaAmount(value: number, locale: Locale): string {
  return formatNumber(value, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function isDiscountTemplateCouncilLine(line: CeadCouncilSendLine): boolean {
  return Boolean(line.formula?.includes("× base ("));
}

/** Percent column for council sends — CEAD defaults or discount template formula. */
export function councilLinePercentDisplay(line: CeadCouncilSendLine): string {
  if (isDiscountTemplateCouncilLine(line) && line.formula) {
    const match = line.formula.match(/^([\d.]+%)/);
    return match?.[1] ?? "—";
  }
  return CEAD_COUNCIL_PERCENT[line.label as keyof typeof CEAD_COUNCIL_PERCENT] ?? "—";
}

export function translateCeadLineLabel(label: string, t: TranslateFn): string {
  const incomeKey =
    CEAD_INCOME_LINE_I18N_KEYS[label as keyof typeof CEAD_INCOME_LINE_I18N_KEYS];
  if (incomeKey) return t(incomeKey);
  const expenseKey =
    CEAD_EXPENSE_LINE_I18N_KEYS[label as keyof typeof CEAD_EXPENSE_LINE_I18N_KEYS];
  if (expenseKey) return t(expenseKey);
  const councilKey =
    CEAD_COUNCIL_SEND_I18N_KEYS[label as keyof typeof CEAD_COUNCIL_SEND_I18N_KEYS];
  if (councilKey) return t(councilKey);
  return label;
}

export function councilCalculationBaseAmount(
  line: CeadCouncilSendLine,
  payload: FinancialMonthlyPayload,
): number {
  const { totalIncome, expenseLines } = payload.cead;
  const pastoral =
    expenseLines.find((row) => row.label === "Asignación Pastoral")?.amount ?? 0;

  if (line.formula?.includes("10%")) {
    return totalIncome - pastoral;
  }

  return totalIncome;
}

export function councilCalculationBaseLabel(
  line: CeadCouncilSendLine,
  payload: FinancialMonthlyPayload,
  t: TranslateFn,
): string {
  if (line.formula?.includes("10%")) {
    return t("preview.ceadMonthly.base.incomeMinusPastoral");
  }

  return t("preview.ceadMonthly.base.totalIncome");
}

export function councilFormulaDetail(
  line: CeadCouncilSendLine,
  payload: FinancialMonthlyPayload,
  locale: Locale,
  t: TranslateFn,
): string {
  if (isDiscountTemplateCouncilLine(line) && line.formula) {
    return line.formula;
  }

  const { totalIncome, expenseLines } = payload.cead;
  const pastoral =
    expenseLines.find((row) => row.label === "Asignación Pastoral")?.amount ?? 0;
  const percent = CEAD_COUNCIL_PERCENT[line.label as keyof typeof CEAD_COUNCIL_PERCENT] ?? "";

  if (line.formula?.includes("10%")) {
    return t("preview.ceadMonthly.formulaDetail.tithe", {
      income: formatFormulaAmount(totalIncome, locale),
      pastoral: formatFormulaAmount(pastoral, locale),
      percent,
    });
  }

  return t("preview.ceadMonthly.formulaDetail.percentOfIncome", {
    income: formatFormulaAmount(totalIncome, locale),
    percent,
  });
}
