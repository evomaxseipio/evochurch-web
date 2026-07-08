import { formatReportPeriodLabel } from "@/lib/reports/period";
import type { MonthPeriod } from "@/lib/reports/period";
import {
  F001_CHURCH_EXPENSE_KEYS,
  F001_CHURCH_TO_COUNCIL_KEYS,
  F001_GENERAL_INCOME_KEYS,
  F001_MINISTRY_INCOME_KEYS,
  F001_MINISTRY_TO_NATIONAL_KEYS,
  F001_SPECIAL_CONTRIBUTION_KEYS,
} from "@/lib/reports/templates/concilio/f001-label-keys";
import type { ConcilioF001Payload } from "@/lib/reports/templates/concilio/f001-types";

function lineItems(
  keys: readonly string[],
  amounts: number[],
): { key: string; amount: number }[] {
  return keys.map((key, index) => ({ key, amount: amounts[index] ?? 0 }));
}

function councilLines(
  keys: readonly string[],
  amounts: number[],
  percents: (number | null)[] = [],
): ConcilioF001Payload["sectionC"]["churchToCouncil"] {
  return keys.map((key, index) => ({
    key,
    amount: amounts[index] ?? 0,
    percent: percents[index] ?? null,
  }));
}

export function buildConcilioF001MockPayload(
  churchId: number,
  period: MonthPeriod,
  meta?: {
    churchName?: string;
    pastorName?: string;
    presbyterio?: string;
    treasurerName?: string;
    churchCode?: string;
    address?: string;
    councilHeader?: string;
  },
): ConcilioF001Payload {
  const generalAmounts = [485_000, 125_400, 45_500, 0, 25_000, 0, 5_000];
  const ministryAmounts = [12_000, 8_500, 4_200, 6_800, 3_100, 5_400, 2_800, 7_200, 1_500];
  const expenseAmounts = [85_000, 45_000, 18_500, 8_200, 5_000, 4_300, 12_000, 6_000, 7_000];

  const generalTotal = generalAmounts.reduce((sum, value) => sum + value, 0);
  const ministryTotal = ministryAmounts.reduce((sum, value) => sum + value, 0);
  const expenseTotal = expenseAmounts.reduce((sum, value) => sum + value, 0);

  const churchCouncilAmounts = [60_090, 20_577, 6_859, 6_859, 8_500, 0, 0, 4_250];
  const churchCouncilPercents: (number | null)[] = [10, 3, 1, 1, null, null, null, 5];
  const ministryNationalAmounts = [1_200, 850, 420, 680, 310, 540, 280, 720, 150];
  const specialAmounts = [3_500, 2_000, 1_800, 2_200, 900, 600, 500, 400, 1_100];

  const churchCouncilSubtotal = churchCouncilAmounts.reduce((sum, v) => sum + v, 0);
  const ministryNationalSubtotal = ministryNationalAmounts.reduce((sum, v) => sum + v, 0);
  const specialSubtotal = specialAmounts.reduce((sum, v) => sum + v, 0);
  const totalCouncilSends =
    churchCouncilSubtotal + ministryNationalSubtotal + specialSubtotal;

  const churchName = meta?.churchName?.trim() || "Iglesia Fuente Inagotable";
  const pastorName = meta?.pastorName?.trim() || "Pr. Juan Méndez";
  const treasurerName = meta?.treasurerName?.trim() || "Pedro Rodríguez";
  const presbyterio = meta?.presbyterio?.trim() || "Distrito Santo Domingo Este";
  const churchCode = meta?.churchCode?.trim() || "IF-042";

  return {
    churchId,
    churchName,
    pastorName,
    presbyterio,
    generatedAt: new Date().toISOString(),
    period,
    periodLabel: formatReportPeriodLabel(period),
    meta: {
      formCode: "F.001",
      councilHeader:
        meta?.councilHeader?.trim() ||
        "Concilio Evangélico Asambleas de Dios — Autopista Duarte Km. 12 1/2, Santo Domingo Oeste",
      presbyterio,
      presbyterName: "Pr. Carlos Rodríguez",
      pastorName,
      pastorCredential: "AD-12845",
      churchName,
      churchCode,
      spouseName: "Sra. María Méndez",
      spouseCredential: "AD-12846",
      treasurerName,
      month: period.month,
      year: period.year,
      preparedAt: new Date().toISOString().slice(0, 10),
      receivedAtNationalOffice: null,
    },
    sectionB: {
      generalIncome: lineItems(F001_GENERAL_INCOME_KEYS, generalAmounts),
      ministryIncome: lineItems(F001_MINISTRY_INCOME_KEYS, ministryAmounts),
      churchExpenses: lineItems(F001_CHURCH_EXPENSE_KEYS, expenseAmounts),
      totals: {
        generalIncome: generalTotal,
        ministryIncome: ministryTotal,
        churchExpenses: expenseTotal,
      },
    },
    sectionC: {
      churchToCouncil: councilLines(
        F001_CHURCH_TO_COUNCIL_KEYS,
        churchCouncilAmounts,
        churchCouncilPercents,
      ),
      ministryToNational: councilLines(
        F001_MINISTRY_TO_NATIONAL_KEYS,
        ministryNationalAmounts,
      ),
      specialContributions: councilLines(
        F001_SPECIAL_CONTRIBUTION_KEYS,
        specialAmounts,
      ),
      subtotals: {
        churchToCouncil: churchCouncilSubtotal,
        ministryToNational: ministryNationalSubtotal,
        specialContributions: specialSubtotal,
      },
    },
    sectionD: {
      church: { savings: 25_000, loanPayment: 8_500, funeralPlan: 1_200 },
      pastor: { savings: 5_000, loanPayment: 2_100, funeralPlan: 800 },
      totalMovements: 42_600,
      receivedAtNationalOffice: null,
    },
    kpis: {
      totalIncome: generalTotal + ministryTotal,
      totalExpense: expenseTotal,
      netBalance: generalTotal + ministryTotal - expenseTotal,
      totalCouncilSends,
    },
    signatures: {
      treasurer: treasurerName,
      pastor: pastorName,
      preparedOn: new Date().toISOString().slice(0, 10),
    },
  };
}
