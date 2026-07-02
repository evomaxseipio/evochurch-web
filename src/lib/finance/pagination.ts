import type { ContributionCategoryFilter } from "@/lib/contributions/types";
import type { LedgerStatusFilter } from "@/lib/ledger/types";
import type { YearMonth } from "@/lib/finance/month-period";
import { monthDateBounds } from "@/lib/finance/month-period";

export const DEFAULT_FINANCE_PAGE_SIZE = 25;
export const FINANCE_PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;

export type FinancePageSize = (typeof FINANCE_PAGE_SIZE_OPTIONS)[number];

export function parseFinancePageSize(value: string | undefined): FinancePageSize {
  const n = Number.parseInt(value ?? "", 10);
  if (FINANCE_PAGE_SIZE_OPTIONS.includes(n as FinancePageSize)) {
    return n as FinancePageSize;
  }
  return DEFAULT_FINANCE_PAGE_SIZE;
}

export function parseFinancePage(value: string | undefined): number {
  return Math.max(1, Number.parseInt(value ?? "1", 10) || 1);
}

export function parseYearMonthParam(
  value: string | undefined,
): YearMonth | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function yearMonthToParam({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseContributionCategoryFilter(
  value: string | undefined,
): ContributionCategoryFilter {
  if (
    value === "tithe" ||
    value === "offering" ||
    value === "donation" ||
    value === "all"
  ) {
    return value;
  }
  return "all";
}

export function parseLedgerStatusFilter(
  value: string | undefined,
): LedgerStatusFilter {
  if (value === "pending" || value === "approved" || value === "all") {
    return value;
  }
  return "all";
}

export function contributionDateBoundsFromMonth(
  month: YearMonth | null,
): { from: string | null; to: string | null } {
  if (!month) return { from: null, to: null };
  const bounds = monthDateBounds(month);
  return { from: bounds.from, to: bounds.to };
}
