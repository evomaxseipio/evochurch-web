import type { Fund } from "@/lib/funds/types";
import type { Ministry } from "@/lib/ministries/types";

export function fundsForMinistry(funds: Fund[], ministryId: string): Fund[] {
  return funds
    .filter((fund) => fund.ministryId === ministryId)
    .sort((a, b) => {
      if (a.fundKind === "operating" && b.fundKind !== "operating") return -1;
      if (b.fundKind === "operating" && a.fundKind !== "operating") return 1;
      return a.name.localeCompare(b.name, "es");
    });
}

export function getMinistryDefaultFund(
  ministry: Ministry,
  funds: Fund[],
): Fund | null {
  if (ministry.defaultFundId) {
    const explicit = funds.find((fund) => fund.fundId === ministry.defaultFundId);
    if (explicit?.isActive) return explicit;
  }

  return (
    fundsForMinistry(funds, ministry.id).find(
      (fund) => fund.fundKind === "operating" && fund.isActive,
    ) ?? null
  );
}

export function isMinistryDefaultFund(
  ministry: Ministry,
  fund: Fund,
  funds: Fund[],
): boolean {
  const defaultFund = getMinistryDefaultFund(ministry, funds);
  return defaultFund?.fundId === fund.fundId;
}

export function filterFundsByMinistryScope(
  funds: Fund[],
  filter: "all" | "church" | string,
): Fund[] {
  if (filter === "all") return funds;
  if (filter === "church") return funds.filter((fund) => !fund.ministryId);
  return funds.filter((fund) => fund.ministryId === filter);
}

export function validateFundInputForKind(input: {
  name: string;
  startDate: string;
  targetAmount: number;
  fundKind?: string;
}): string | null {
  if (!input.name.trim()) return "errors.requiredFields";
  if (!input.startDate) return "errors.requiredFields";

  const kind = input.fundKind ?? "operating";
  if (kind !== "operating" && (!input.targetAmount || input.targetAmount <= 0)) {
    return "finances.invalidAmount";
  }

  return null;
}
