import type { PendingAuthorizationItem } from "@/lib/dashboard/types";

/** Fallback title strings still returned by legacy RPC / aggregate paths. */
const LEGACY_PENDING_EXPENSE_TITLE = "Egreso pendiente";
const LEGACY_FUND_TRANSFER_TITLE = "Transferencia entre fondos";

export function resolvePendingItemTitleKey(
  item: Pick<PendingAuthorizationItem, "kind" | "title" | "titleKey">,
): PendingAuthorizationItem["titleKey"] | undefined {
  if (item.titleKey) return item.titleKey;
  if (item.kind === "fund_transfer") return "pendingFundTransfer";
  const trimmed = item.title.trim();
  if (!trimmed || trimmed === LEGACY_PENDING_EXPENSE_TITLE) {
    return "pendingExpenseDefault";
  }
  if (trimmed === LEGACY_FUND_TRANSFER_TITLE) {
    return "pendingFundTransfer";
  }
  return undefined;
}

export function resolvePendingItemTitle(
  item: Pick<PendingAuthorizationItem, "kind" | "title" | "titleKey">,
  t: (key: "pendingFundTransfer" | "pendingExpenseDefault") => string,
): string {
  const titleKey = resolvePendingItemTitleKey(item);
  return titleKey ? t(titleKey) : item.title;
}
