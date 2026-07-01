"use client";

import { Icons } from "@/components/icons";
import {
  formatMovementDateShort,
  paymentMethodLabel,
  statusChipClass,
  statusLabel,
} from "@/lib/ledger/parse";
import type { LedgerEntry } from "@/lib/ledger/types";
import { fmtRD } from "@/lib/format-currency";

export function LedgerStatusChip({ entry }: { entry: LedgerEntry }) {
  return (
    <span className={`chip ${statusChipClass(entry.status)}`}>
      <span className="pip" /> {statusLabel(entry.status)}
    </span>
  );
}

export function FundTransferChip() {
  return (
    <span
      className="chip"
      style={{
        background: "color-mix(in oklab, var(--accent) 14%, transparent)",
        color: "var(--accent)",
      }}
    >
      Transferencia
    </span>
  );
}

export function LedgerAmount({ entry }: { entry: LedgerEntry }) {
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
      {fmtRD(entry.amount)}
    </span>
  );
}

export function LedgerMeta({ entry }: { entry: LedgerEntry }) {
  return (
    <div className="tiny muted tnum">
      {formatMovementDateShort(entry.movementDate)} ·{" "}
      {paymentMethodLabel(entry.paymentMethod)}
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
  return (
    <button
      type="button"
      className="btn outline sm"
      onClick={onClick}
      disabled={pending}
      style={{ whiteSpace: "nowrap" }}
    >
      <Icons.check size={14} /> Revisar
    </button>
  );
}

export function LedgerMovementTypeCell({ entry }: { entry: LedgerEntry }) {
  if (entry.isFundTransfer) {
    return <FundTransferChip />;
  }

  const isIncome = entry.direction === "income";
  const color = isIncome ? "var(--success)" : "var(--danger)";
  const bg = isIncome ? "var(--success-bg)" : "var(--danger-bg)";
  const label = entry.typeName || (isIncome ? "Ingreso" : "Egreso");

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
  const isIncome = entry.direction === "income";
  return (
    <span
      className="chip"
      style={{
        background: isIncome ? "var(--success-bg)" : "var(--danger-bg)",
        color: isIncome ? "var(--success)" : "var(--danger)",
      }}
    >
      {isIncome ? "Ingreso" : "Egreso"}
    </span>
  );
}

/** @deprecated Use Ledger* components */
export const TransactionStatusChip = LedgerStatusChip;
export const TransactionAmount = LedgerAmount;
export const TransactionMeta = LedgerMeta;
