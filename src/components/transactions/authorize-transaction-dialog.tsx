"use client";

import {
  reviewPendingExpenseAction,
  type TransactionActionResult,
} from "@/app/(app)/finances/transactions/actions";
import { Icons } from "@/components/icons";
import { useActionToast } from "@/hooks/use-action-toast";
import { fmtRD } from "@/lib/format-currency";
import {
  isPendingFundTransferExpense,
  ledgerEntryToExpenseTransactionId,
} from "@/lib/ledger/parse";
import type { LedgerEntry } from "@/lib/ledger/types";
import { formatDate } from "@/lib/i18n/format";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState, startTransition } from "react";

const initial: TransactionActionResult | null = null;

export function AuthorizeTransactionDialog({
  entry,
  onClose,
}: {
  entry: LedgerEntry;
  onClose: () => void;
}) {
  const tCommon = useTranslations("common");
  const tFinances = useTranslations("finances");
  const tTransactions = useTranslations("transactions");
  const locale = useLocale() as "es" | "en" | "fr";
  const [comments, setComments] = useState("");
  const [state, formAction, pending] = useActionState(
    reviewPendingExpenseAction,
    initial,
  );
  const [lastDecision, setLastDecision] = useState<"approve" | "reject">(
    "approve",
  );

  const isTransfer = isPendingFundTransferExpense(entry);

  useActionToast(state, {
    successMessage:
      lastDecision === "reject"
        ? isTransfer
          ? tTransactions("messages.transferRejected")
          : tTransactions("messages.expenseRejected")
        : isTransfer
          ? tTransactions("messages.transferAuthorized")
          : tTransactions("messages.authorized"),
    onSuccess: onClose,
  });

  function submit(decision: "approve" | "reject") {
    setLastDecision(decision);
    const fd = new FormData();
    fd.set("decision", decision);
    if (isTransfer && entry.fundTransferId) {
      fd.set("fundTransferId", entry.fundTransferId);
    } else {
      fd.set(
        "transactionId",
        String(ledgerEntryToExpenseTransactionId(entry)),
      );
    }
    fd.set("comments", comments);
    startTransition(() => formAction(fd));
  }

  return (
    <>
      <div
        className="drawer-backdrop"
        style={{ zIndex: 60 }}
        onClick={pending ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-labelledby="authorize-tx-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 61,
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
          width: 440,
          maxWidth: "92vw",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <div className="eyebrow">{tTransactions("review")}</div>
        <h3 id="authorize-tx-title" style={{ margin: "4px 0 0", fontSize: 18 }}>
          {isTransfer ? tTransactions("reviewTransfer") : tTransactions("reviewPendingExpense")}
        </h3>
        <p className="muted" style={{ margin: "8px 0 16px", fontSize: 13 }}>
          {isTransfer
            ? tTransactions("reviewTransferHelp")
            : tTransactions("reviewExpenseHelp")}
        </p>

        <div className="card flat" style={{ padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 600 }}>{entry.description}</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>
            {isTransfer &&
            entry.transferSourceFundName &&
            entry.transferDestinationFundName ? (
              <>
                {entry.transferSourceFundName} →{" "}
                {entry.transferDestinationFundName} ·{" "}
              </>
            ) : (
              <>{entry.fundName} · </>
            )}
            {formatDate(entry.movementDate, locale, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}{" "}
            · {entry.paymentMethod}
          </div>
          <div
            className="tnum mono"
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: isTransfer ? "var(--accent)" : "var(--danger)",
              marginTop: 10,
            }}
          >
            −{fmtRD(entry.amount, locale)}
          </div>
        </div>

        <div className="field">
          <label>
            {tCommon("notes")} ({tCommon("optional").toLowerCase()})
          </label>
          <div
            className="input-wrap"
            style={{ alignItems: "flex-start", padding: "10px 12px" }}
          >
            <textarea
              rows={2}
              value={comments}
              placeholder={tFinances("authorizeReason")}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
        </div>

        <div
          className="row"
          style={{ marginTop: 20, justifyContent: "flex-end", gap: 8 }}
        >
          <button
            type="button"
            className="btn outline"
            onClick={onClose}
            disabled={pending}
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            className="btn outline"
            onClick={() => submit("reject")}
            disabled={pending}
            style={{
              color: "var(--danger)",
              borderColor: "color-mix(in oklab, var(--danger) 40%, transparent)",
            }}
          >
            <Icons.x size={14} /> {tFinances("authorizeReject")}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => submit("approve")}
            disabled={pending}
            style={{ flex: 1, maxWidth: 200 }}
          >
            <Icons.check size={14} /> {tFinances("authorizeApprove")}
          </button>
        </div>
      </div>
    </>
  );
}

/** @deprecated Use AuthorizeTransactionDialog — same component, supports reject */
export const ReviewTransactionDialog = AuthorizeTransactionDialog;
