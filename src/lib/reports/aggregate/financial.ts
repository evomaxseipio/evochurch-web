import type { Contribution } from "@/lib/contributions/types";
import type { LedgerEntry } from "@/lib/ledger/types";

export type ContributionCategoryTotals = {
  tithe: number;
  offering: number;
  donation: number;
  other: number;
  total: number;
};

export type ExpenseCategoryTotals = {
  byName: Record<string, number>;
  total: number;
};

export type FinancialPeriodTotals = {
  contributions: ContributionCategoryTotals;
  expenses: ExpenseCategoryTotals;
  netIncome: number;
};

function contributionCategoryKey(
  category: string | null | undefined,
): keyof Omit<ContributionCategoryTotals, "total" | "other"> | "other" {
  if (category === "tithe" || category === "offering" || category === "donation") {
    return category;
  }
  return "other";
}

/** Agrupa contribuciones por categoría estándar (sin I/O). */
export function aggregateContributionsByCategory(
  entries: Contribution[],
): ContributionCategoryTotals {
  const totals: ContributionCategoryTotals = {
    tithe: 0,
    offering: 0,
    donation: 0,
    other: 0,
    total: 0,
  };

  for (const entry of entries) {
    const key = contributionCategoryKey(entry.category);
    if (key === "other") {
      totals.other += entry.amount;
    } else {
      totals[key] += entry.amount;
    }
    totals.total += entry.amount;
  }

  return totals;
}

/** Agrupa egresos del ledger por nombre de tipo (sin I/O). */
export function aggregateExpensesByTypeName(
  entries: LedgerEntry[],
): ExpenseCategoryTotals {
  const byName: Record<string, number> = {};
  let total = 0;

  for (const entry of entries) {
    if (entry.direction !== "expense") continue;
    const name = entry.typeName?.trim() || "Sin tipo";
    byName[name] = (byName[name] ?? 0) + entry.amount;
    total += entry.amount;
  }

  return { byName, total };
}

export function combineFinancialTotals(
  contributions: ContributionCategoryTotals,
  expenses: ExpenseCategoryTotals,
): FinancialPeriodTotals {
  return {
    contributions,
    expenses,
    netIncome: contributions.total - expenses.total,
  };
}
