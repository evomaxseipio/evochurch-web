"use client";

import { TransactionActionMenu } from "@/components/transactions/transaction-action-menu";
import {
  AuthorizeButton,
  DirectionChip,
  FundTransferChip,
  LedgerAmount,
  LedgerMeta,
  LedgerStatusChip,
} from "@/components/transactions/transaction-ui";
import { isPendingFundTransferExpense } from "@/lib/ledger/parse";
import type { LedgerEntry } from "@/lib/ledger/types";

export function TransactionCard({
  entry,
  onEdit,
  onDelete,
  onAuthorize,
  authorizePending,
  canAuthorize = false,
}: {
  entry: LedgerEntry;
  onEdit: () => void;
  onDelete: () => void;
  onAuthorize: () => void;
  authorizePending?: boolean;
  canAuthorize?: boolean;
}) {
  const isPendingExpense =
    entry.direction === "expense" && entry.status === "PENDING";
  const isPendingTransfer = isPendingFundTransferExpense(entry);
  const editable =
    entry.entryKind === "operational_income" ||
    (isPendingExpense && !entry.isFundTransfer) ||
    isPendingTransfer;

  return (
    <div
      className="card"
      style={{
        padding: 14,
        position: "relative",
        ...(entry.isFundTransfer
          ? {
              borderColor:
                "color-mix(in oklab, var(--accent) 28%, var(--line))",
              background:
                "color-mix(in oklab, var(--accent) 4%, var(--bg-1))",
            }
          : {}),
      }}
    >
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <TransactionActionMenu
          canEdit={editable}
          canDelete={editable}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      <div style={{ paddingRight: 36 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{entry.description}</div>
        <div className="tiny muted" style={{ marginTop: 4 }}>
          {entry.createdBy}
        </div>
        <div style={{ marginTop: 10 }}>
          <LedgerAmount entry={entry} />
        </div>
        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {entry.isFundTransfer ? <FundTransferChip /> : <DirectionChip entry={entry} />}
          <span className="chip">{entry.fundName}</span>
          <LedgerStatusChip entry={entry} />
        </div>
        <div style={{ marginTop: 8 }}>
          <LedgerMeta entry={entry} />
        </div>
        {isPendingExpense && canAuthorize ? (
          <div style={{ marginTop: 12 }}>
            <AuthorizeButton onClick={onAuthorize} pending={authorizePending} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
