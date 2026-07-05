import type { Fund } from "@/lib/funds/types";
import type { Ministry } from "@/lib/ministries/types";

export function isMinistryOperatingFund(fund: Fund): boolean {
  return fund.ministryId != null && fund.fundKind === "operating";
}

export function canDeleteFund(fund: Fund): boolean {
  return !isMinistryOperatingFund(fund);
}

export function getMinistryOperatingFund(
  funds: Fund[],
  ministryId: string,
): Fund | null {
  if (!ministryId) return null;
  return (
    funds.find(
      (fund) =>
        fund.ministryId === ministryId && fund.fundKind === "operating",
    ) ?? null
  );
}

export function hasMinistryOperatingFund(
  funds: Fund[],
  ministryId: string,
): boolean {
  return getMinistryOperatingFund(funds, ministryId) != null;
}

export function ministryAllowsOperatingKind(
  funds: Fund[],
  ministryId: string | null | undefined,
): boolean {
  if (!ministryId) return true;
  return !hasMinistryOperatingFund(funds, ministryId);
}

export function findMinistryById(
  ministries: Ministry[] | undefined,
  ministryId: string,
): Ministry | null {
  if (!ministryId || !ministries?.length) return null;
  return ministries.find((m) => m.id === ministryId) ?? null;
}

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
  const operating = getMinistryOperatingFund(funds, ministry.id);
  if (operating?.isActive) return operating;

  if (ministry.defaultFundId) {
    const explicit = funds.find(
      (fund) =>
        fund.fundId === ministry.defaultFundId &&
        fund.ministryId === ministry.id,
    );
    if (explicit?.isActive) return explicit;
  }

  return operating;
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
  ministryId?: string | null;
  funds?: Fund[];
  fundId?: string | null;
}): string | null {
  if (!input.name.trim()) return "errors.requiredFields";
  if (!input.startDate) return "errors.requiredFields";

  const kind = input.fundKind ?? "operating";
  if (kind !== "operating" && (!input.targetAmount || input.targetAmount <= 0)) {
    return "finances.invalidAmount";
  }

  if (
    kind === "operating" &&
    input.ministryId &&
    input.funds &&
    hasMinistryOperatingFund(input.funds, input.ministryId) &&
    !input.fundId
  ) {
    return "ministerios.funds.operatingAlreadyExists";
  }

  return null;
}
