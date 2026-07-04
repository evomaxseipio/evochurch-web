import type { Contribution } from "@/lib/contributions/types";
import type { LedgerEntry } from "@/lib/ledger/types";
import {
  CEAD_COUNCIL_SEND_LABELS,
  CEAD_EXPENSE_LINE_LABELS,
  CEAD_INCOME_LINE_LABELS,
} from "@/lib/reports/templates/cead/constants";
import { formatReportPeriodLabel } from "@/lib/reports/period";
import type { MonthPeriod } from "@/lib/reports/period";

export type CeadLineAmount = { label: string; amount: number };

export type CeadCouncilSendLine = CeadLineAmount & {
  formula?: string;
};

export type CeadFinancialMonthlyData = {
  periodLabel: string;
  incomeLines: CeadLineAmount[];
  expenseLines: CeadLineAmount[];
  councilLines: CeadCouncilSendLine[];
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  notes: string[];
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/** Sección B — ingresos CEAD v1 (ver AGENT-PROMPT § REP-2). */
export function mapContributionsToCeadIncome(
  entries: Contribution[],
): CeadLineAmount[] {
  const amounts = new Map<string, number>(
    CEAD_INCOME_LINE_LABELS.map((label) => [label, 0]),
  );

  for (const entry of entries) {
    if (entry.category === "tithe") {
      amounts.set("Diezmos", (amounts.get("Diezmos") ?? 0) + entry.amount);
      continue;
    }

    if (entry.category === "offering") {
      const name = normalizeName(entry.typeName);
      if (name.includes("especial")) {
        amounts.set(
          "Ofrendas Especiales",
          (amounts.get("Ofrendas Especiales") ?? 0) + entry.amount,
        );
      } else if (
        name.includes("voluntaria") ||
        name.includes("voluntari") ||
        name === "ofrenda" ||
        name.includes("ofrenda general")
      ) {
        amounts.set(
          "Ofrendas Voluntarias",
          (amounts.get("Ofrendas Voluntarias") ?? 0) + entry.amount,
        );
      } else {
        amounts.set(
          "Otros Ingresos",
          (amounts.get("Otros Ingresos") ?? 0) + entry.amount,
        );
      }
      continue;
    }

    if (entry.category === "donation") {
      amounts.set(
        "Donaciones",
        (amounts.get("Donaciones") ?? 0) + entry.amount,
      );
      continue;
    }

    amounts.set(
      "Otros Ingresos",
      (amounts.get("Otros Ingresos") ?? 0) + entry.amount,
    );
  }

  return CEAD_INCOME_LINE_LABELS.map((label) => ({
    label,
    amount: amounts.get(label) ?? 0,
  }));
}

/** Sección B — egresos CEAD v1 (heurística por nombre de tipo). */
export function mapExpensesToCeadLines(
  entries: LedgerEntry[],
): CeadLineAmount[] {
  const amounts = new Map<string, number>(
    CEAD_EXPENSE_LINE_LABELS.map((label) => [label, 0]),
  );

  const rules: { label: (typeof CEAD_EXPENSE_LINE_LABELS)[number]; re: RegExp }[] =
    [
      { label: "Asignación Pastoral", re: /pastoral/i },
      { label: "Alquileres", re: /alquiler|templo|local|casa/i },
      {
        label: "Servicios (Luz, Agua, Internet)",
        re: /servicio|luz|agua|tel|internet/i,
      },
      { label: "Mantenimiento y Reparaciones", re: /manten|repar/i },
      { label: "Materiales y Suministros", re: /material|suminist/i },
    ];

  for (const entry of entries) {
    if (entry.direction !== "expense") continue;
    const name = entry.typeName || entry.description || "";
    let matched = false;
    for (const rule of rules) {
      if (rule.re.test(name)) {
        amounts.set(rule.label, (amounts.get(rule.label) ?? 0) + entry.amount);
        matched = true;
        break;
      }
    }
    if (!matched) {
      amounts.set(
        "Otros Egresos",
        (amounts.get("Otros Egresos") ?? 0) + entry.amount,
      );
    }
  }

  return CEAD_EXPENSE_LINE_LABELS.map((label) => ({
    label,
    amount: amounts.get(label) ?? 0,
  }));
}

export function buildCeadCouncilSends(
  incomeLines: CeadLineAmount[],
  expenseLines: CeadLineAmount[],
): CeadCouncilSendLine[] {
  const totalIncome = incomeLines.reduce((sum, line) => sum + line.amount, 0);
  const pastoral =
    expenseLines.find((line) => line.label === "Asignación Pastoral")?.amount ??
    0;
  const baseDiezmo = Math.max(totalIncome - pastoral, 0);

  const lines: CeadCouncilSendLine[] = [
    {
      label: CEAD_COUNCIL_SEND_LABELS[0]!,
      amount: Math.round(baseDiezmo * 0.1 * 100) / 100,
      formula: "10% × (ingresos − asignación pastoral)",
    },
    {
      label: CEAD_COUNCIL_SEND_LABELS[1]!,
      amount: Math.round(totalIncome * 0.03 * 100) / 100,
      formula: "3% × total ingresos",
    },
    {
      label: CEAD_COUNCIL_SEND_LABELS[2]!,
      amount: Math.round(totalIncome * 0.01 * 100) / 100,
      formula: "1% × total ingresos",
    },
    {
      label: CEAD_COUNCIL_SEND_LABELS[3]!,
      amount: Math.round(totalIncome * 0.01 * 100) / 100,
      formula: "1% × total ingresos",
    },
  ];

  return lines;
}

export function buildCeadFinancialMonthlyData(
  period: MonthPeriod,
  contributions: Contribution[],
  ledgerEntries: LedgerEntry[],
): CeadFinancialMonthlyData {
  const incomeLines = mapContributionsToCeadIncome(contributions);
  const expenseLines = mapExpensesToCeadLines(ledgerEntries);
  const totalIncome = incomeLines.reduce((sum, line) => sum + line.amount, 0);
  const totalExpense = expenseLines.reduce((sum, line) => sum + line.amount, 0);
  const councilLines = buildCeadCouncilSends(incomeLines, expenseLines);

  return {
    periodLabel: formatReportPeriodLabel(period),
    incomeLines,
    expenseLines,
    councilLines,
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    notes: [
      "Envíos al concilio calculados con reglas v1 documentadas en EvoChurch.",
    ],
  };
}
