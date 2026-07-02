"use server";

import { getActionSession } from "@/lib/auth/app-session";
import type {
  ExpenseInput,
  FundTransferInput,
  OperationalIncomeInput,
} from "@/lib/ledger/types";
import {
  createOperationalIncome,
  deleteOperationalIncome,
  updateOperationalIncome,
} from "@/lib/services/ledger";
import {
  authorizeFundTransfer,
  createFundTransfer,
  deleteFundTransfer,
  rejectFundTransfer,
  updateFundTransfer,
} from "@/lib/services/fund-transfers";
import {
  authorizeTransaction,
  createTransaction,
  deleteTransaction,
  rejectTransaction,
  updateTransaction,
} from "@/lib/services/transactions";
import { revalidateFundsCatalog } from "@/lib/cache/catalog-tags";
import { revalidatePath } from "next/cache";

export type TransactionActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function sessionContext() {
  const { supabase, session } = await getActionSession();
  return {
    supabase,
    churchId: session.churchId,
    profileId: session.profileId,
    userId: session.authUserId,
    canAuthorizeFinances: session.canAuthorizeFinances,
  };
}

function parseOperationalInput(formData: FormData): OperationalIncomeInput {
  return {
    incomeId: String(formData.get("incomeId") ?? "").trim() || null,
    fundId: String(formData.get("fundId") ?? "").trim(),
    incomeTypeId: Number.parseInt(
      String(formData.get("incomeTypeId") ?? ""),
      10,
    ),
    amount: Number.parseFloat(String(formData.get("amount") ?? "")) || 0,
    description: String(formData.get("description") ?? "").trim(),
    paymentMethod: String(formData.get("paymentMethod") ?? "").trim(),
    paymentDate: String(formData.get("paymentDate") ?? "").trim(),
    contributorName:
      String(formData.get("contributorName") ?? "").trim() || null,
  };
}

function parseExpenseInput(formData: FormData): ExpenseInput {
  const transactionIdRaw = String(formData.get("transactionId") ?? "").trim();
  const transactionDate = String(formData.get("transactionDate") ?? "").trim();

  return {
    transactionId: transactionIdRaw
      ? Number.parseInt(transactionIdRaw, 10)
      : null,
    fundId: String(formData.get("fundId") ?? "").trim(),
    expensesTypeId: Number.parseInt(
      String(formData.get("expensesTypeId") ?? ""),
      10,
    ),
    amount: Number.parseFloat(String(formData.get("amount") ?? "")) || 0,
    description: String(formData.get("description") ?? "").trim(),
    paymentMethod: String(formData.get("paymentMethod") ?? "").trim(),
    transactionDate: transactionDate || undefined,
  };
}

function parseFundTransferInput(formData: FormData): FundTransferInput {
  const transferIdRaw = String(formData.get("transferId") ?? "").trim();
  return {
    transferId: transferIdRaw || null,
    sourceFundId: String(formData.get("sourceFundId") ?? "").trim(),
    destinationFundId: String(formData.get("destinationFundId") ?? "").trim(),
    amount: Number.parseFloat(String(formData.get("amount") ?? "")) || 0,
    userComment: String(formData.get("userComment") ?? "").trim() || null,
    paymentMethod: String(formData.get("paymentMethod") ?? "").trim(),
    movementDate: String(formData.get("movementDate") ?? "").trim(),
  };
}

export async function saveLedgerEntryAction(
  _prev: TransactionActionResult | null,
  formData: FormData,
): Promise<TransactionActionResult> {
  try {
    const movementType = String(formData.get("movementType") ?? "expense");
    const { supabase, churchId, profileId, userId } = await sessionContext();

    if (movementType === "income") {
      const input = parseOperationalInput(formData);
      if (input.incomeId) {
        await updateOperationalIncome(supabase, churchId, userId, input);
      } else {
        await createOperationalIncome(supabase, churchId, userId, input);
      }
    } else if (movementType === "transfer") {
      const input = parseFundTransferInput(formData);
      if (input.sourceFundId === input.destinationFundId) {
        return {
          ok: false,
          error: "El fondo origen y destino deben ser distintos.",
        };
      }
      if (input.transferId) {
        await updateFundTransfer(supabase, churchId, input);
      } else {
        await createFundTransfer(supabase, churchId, profileId, input);
      }
    } else {
      const input = parseExpenseInput(formData);
      if (input.transactionId) {
        await updateTransaction(supabase, churchId, {
          transactionId: input.transactionId,
          fundId: input.fundId,
          expensesTypeId: input.expensesTypeId,
          amount: input.amount,
          description: input.description,
          paymentMethod: input.paymentMethod,
          transactionDate: input.transactionDate,
        });
      } else {
        await createTransaction(supabase, churchId, profileId, {
          fundId: input.fundId,
          expensesTypeId: input.expensesTypeId,
          amount: input.amount,
          description: input.description,
          paymentMethod: input.paymentMethod,
          transactionDate: input.transactionDate,
        });
      }
    }

    revalidateFundsCatalog(churchId);
    revalidatePath("/finances/transactions");
    revalidatePath("/finances/funds");
    revalidatePath("/finances/contributions");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo guardar el movimiento.",
    };
  }
}

/** @deprecated Use saveLedgerEntryAction */
export const saveTransactionAction = saveLedgerEntryAction;

/** @deprecated Use reviewPendingExpenseAction */
export const authorizeTransactionAction = reviewPendingExpenseAction;

export async function reviewPendingExpenseAction(
  _prev: TransactionActionResult | null,
  formData: FormData,
): Promise<TransactionActionResult> {
  try {
    const decision = String(formData.get("decision") ?? "approve");
    const fundTransferId = String(formData.get("fundTransferId") ?? "").trim();
    const comments = String(formData.get("comments") ?? "").trim() || null;
    const { supabase, churchId, profileId, userId, canAuthorizeFinances } =
      await sessionContext();

    if (fundTransferId) {
      if (!canAuthorizeFinances) {
        return {
          ok: false,
          error:
            decision === "reject"
              ? "No tienes permisos para rechazar transferencias."
              : "No tienes permisos para autorizar transferencias.",
        };
      }

      if (decision === "reject") {
        await rejectFundTransfer(
          supabase,
          churchId,
          fundTransferId,
          profileId,
          userId,
          comments,
        );
      } else {
        await authorizeFundTransfer(
          supabase,
          churchId,
          fundTransferId,
          profileId,
          userId,
          comments,
        );
      }
    } else {
      const transactionId = Number.parseInt(
        String(formData.get("transactionId") ?? ""),
        10,
      );
      if (!transactionId) return { ok: false, error: "Transacción no válida." };

      if (!canAuthorizeFinances) {
        return {
          ok: false,
          error:
            decision === "reject"
              ? "No tienes permisos para rechazar egresos."
              : "No tienes permisos para autorizar egresos.",
        };
      }

      if (decision === "reject") {
        await rejectTransaction(
          supabase,
          churchId,
          transactionId,
          profileId,
          comments,
        );
      } else {
        await authorizeTransaction(
          supabase,
          churchId,
          transactionId,
          profileId,
          comments,
        );
      }
    }

    revalidatePath("/finances/transactions");
    revalidatePath("/finances/funds");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "No se pudo procesar la revisión del movimiento.",
    };
  }
}

export async function deleteLedgerEntryAction(
  _prev: TransactionActionResult | null,
  formData: FormData,
): Promise<TransactionActionResult> {
  try {
    const fundTransferId = String(formData.get("fundTransferId") ?? "").trim();
    const entryKind = String(formData.get("entryKind") ?? "");
    const entryId = String(formData.get("entryId") ?? "").trim();
    const { supabase, churchId } = await sessionContext();

    if (fundTransferId) {
      await deleteFundTransfer(supabase, churchId, fundTransferId);
    } else if (!entryId) {
      return { ok: false, error: "Registro no válido." };
    } else if (entryKind === "operational_income") {
      await deleteOperationalIncome(supabase, churchId, entryId);
    } else {
      const transactionId = Number.parseInt(entryId, 10);
      if (!transactionId) {
        return { ok: false, error: "Transacción no válida." };
      }
      await deleteTransaction(supabase, churchId, transactionId);
    }

    revalidateFundsCatalog(churchId);
    revalidatePath("/finances/transactions");
    revalidatePath("/finances/funds");
    revalidatePath("/finances/contributions");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo eliminar el movimiento.",
    };
  }
}

/** @deprecated Use deleteLedgerEntryAction */
export const deleteTransactionAction = deleteLedgerEntryAction;
