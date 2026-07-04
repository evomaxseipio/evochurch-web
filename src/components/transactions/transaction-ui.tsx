"use client";

import { Icons } from "@/components/icons";
import {
  statusChipClass,
} from "@/lib/ledger/parse";
import type { LedgerEntry } from "@/lib/ledger/types";
import { fmtRD } from "@/lib/format-currency";
import { formatDate } from "@/lib/i18n/format";
import { useLocale, useTranslations } from "next-intl";

export function LedgerStatusChip({ entry }: { entry: LedgerEntry }) {
  const tCommon = useTranslations("common");
  return (
    <span className={`chip ${statusChipClass(entry.status)}`}>
      <span className="pip" /> {statusLabel(entry.status, tCommon)}
    </span>
  );
}

export function FundTransferChip() {
  const tFinances = useTranslations("finances");
  return (
    <span
      className="chip"
      style={{
        background: "color-mix(in oklab, var(--accent) 14%, transparent)",
        color: "var(--accent)",
      }}
    >
      {tFinances("txTypes.transfer")}
    </span>
  );
}

export function LedgerAmount({ entry }: { entry: LedgerEntry }) {
  const locale = useLocale() as "es" | "en" | "fr";
  const isIncome = entry.direction === "income";
  const isTransfer = entry.isFundTransfer;
  const color = isTransfer
    ? "var(--accent)"
    : isIncome
      ? "var(--success)"
      : "var(--danger)";
  return (
    <span className="tnum mono" style={{ fontWeight: 600, color }}>
      {isIncome ? "+" : "−"}
      {fmtRD(entry.amount, locale)}
    </span>
  );
}

export function LedgerMeta({ entry }: { entry: LedgerEntry }) {
  const locale = useLocale() as "es" | "en" | "fr";
  const tFinances = useTranslations("finances");
  return (
    <div className="tiny muted tnum">
      {formatDate(entry.movementDate, locale, {
        day: "2-digit",
        month: "short",
      })}{" "}
      · {paymentMethodLabel(entry.paymentMethod, tFinances)}
    </div>
  );
}

export function AuthorizeButton({
  onClick,
  pending,
}: {
  onClick: () => void;
  pending?: boolean;
}) {
  const tTransactions = useTranslations("transactions");
  return (
    <button
      type="button"
      className="btn outline sm"
      onClick={onClick}
      disabled={pending}
      style={{ whiteSpace: "nowrap" }}
    >
      <Icons.check size={14} /> {tTransactions("review")}
    </button>
  );
}

export function LedgerMovementTypeCell({ entry }: { entry: LedgerEntry }) {
  const tFinances = useTranslations("finances");
  if (entry.isFundTransfer) {
    return <FundTransferChip />;
  }

  const isIncome = entry.direction === "income";
  const color = isIncome ? "var(--success)" : "var(--danger)";
  const bg = isIncome ? "var(--success-bg)" : "var(--danger-bg)";
  const label =
    entry.typeName ||
    (isIncome ? tFinances("txTypes.income") : tFinances("txTypes.expense"));

  return (
    <span
      className="chip"
      style={{ background: bg, color, maxWidth: 130 }}
      title={label}
    >
      <span className="pip" />
      <span className="table-clip" style={{ maxWidth: 108, display: "inline-block" }}>
        {label}
      </span>
    </span>
  );
}

export function DirectionChip({ entry }: { entry: LedgerEntry }) {
  const tFinances = useTranslations("finances");
  const isIncome = entry.direction === "income";
  return (
    <span
      className="chip"
      style={{
        background: isIncome ? "var(--success-bg)" : "var(--danger-bg)",
        color: isIncome ? "var(--success)" : "var(--danger)",
      }}
    >
      {isIncome ? tFinances("txTypes.income") : tFinances("txTypes.expense")}
    </span>
  );
}

function statusLabel(
  status: LedgerEntry["status"],
  tCommon: ReturnType<typeof useTranslations<"common">>,
): string {
  switch (status) {
    case "CONFIRMED":
    case "APPROVED":
      return tCommon("approved");
    case "PENDING":
      return tCommon("pending");
    case "REJECTED":
      return tCommon("inactive");
    default:
      return status;
  }
}

function paymentMethodLabel(
  method: string,
  tFinances: ReturnType<typeof useTranslations<"finances">>,
): string {
  switch (method) {
    case "Cash":
      return tFinances("paymentMethods.cash");
    case "Transfer":
      return tFinances("paymentMethods.transfer");
    case "Cheque":
    case "Check":
      return tFinances("paymentMethods.check");
    case "Card":
      return tFinances("paymentMethods.card");
    default:
      return method || "—";
  }
}

/** @deprecated Use Ledger* components */
export const TransactionStatusChip = LedgerStatusChip;
export const TransactionAmount = LedgerAmount;
export const TransactionMeta = LedgerMeta;
