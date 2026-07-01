import { parseExpenseTypesResponse } from "@/lib/ledger/parse";
import type { ExpenseInput } from "@/lib/ledger/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export async function fetchTransactions(
  supabase: SupabaseClient,
  churchId: number,
  fundId?: string | null,
) {
  const { fetchFinanceLedger } = await import("@/lib/services/ledger");
  const { entries, pendingAuthorization } = await fetchFinanceLedger(
    supabase,
    churchId,
    { fundId },
  );
  return {
    header: null,
    transactions: entries.filter((e) => e.entryKind === "expense"),
    pendingAuthorization,
  };
}

export async function fetchExpenseTypes(
  supabase: SupabaseClient,
  churchId: number,
) {
  const { data, error } = await supabase.rpc("spgetexpensestypes", {
    p_church_id: churchId,
  });

  if (error) throw error;
  return parseExpenseTypesResponse(data);
}

function validateExpenseInput(input: ExpenseInput): void {
  if (!input.fundId) throw new Error("Selecciona un fondo.");
  if (!input.expensesTypeId) throw new Error("Selecciona un tipo de gasto.");
  if (!input.amount || input.amount <= 0) {
    throw new Error("El monto debe ser mayor que cero.");
  }
  if (!input.description.trim()) {
    throw new Error("La descripción es obligatoria.");
  }
  if (input.description.trim().length > 250) {
    throw new Error("La descripción no puede superar 250 caracteres.");
  }
  if (!input.paymentMethod) throw new Error("Selecciona un método de pago.");
}

export async function createTransaction(
  supabase: SupabaseClient,
  churchId: number,
  profileId: string,
  input: ExpenseInput,
): Promise<void> {
  validateExpenseInput(input);

  const { error } = await supabase.rpc("fn_create_transaction", {
    p_church_id: churchId,
    p_expenses_type_id: input.expensesTypeId,
    p_fund_id: input.fundId,
    p_created_by_profile_id: profileId,
    p_transaction_amount: input.amount,
    p_description: input.description.trim(),
    p_payment_method: input.paymentMethod,
  });

  if (error) throw error;
}

export async function updateTransaction(
  supabase: SupabaseClient,
  churchId: number,
  input: ExpenseInput,
): Promise<void> {
  const transactionId = input.transactionId;
  if (!transactionId) throw new Error("Transacción no válida.");

  validateExpenseInput(input);

  const { data: existing, error: findError } = await supabase
    .from("transactions")
    .select("church_id, authorization_status")
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (findError) throw findError;

  const row = asRecord(existing);
  if (!row || Number(row.church_id) !== churchId) {
    throw new Error("Transacción no encontrada.");
  }

  if (String(row.authorization_status).toUpperCase() !== "PENDING") {
    throw new Error("Solo se pueden editar transacciones pendientes.");
  }

  const payload: Record<string, unknown> = {
    fund_id: input.fundId,
    expenses_type_id: input.expensesTypeId,
    transaction_amount: input.amount,
    transaction_description: input.description.trim(),
    payment_method: input.paymentMethod,
  };

  if (input.transactionDate) {
    payload.transaction_date = input.transactionDate;
  }

  const { error } = await supabase
    .from("transactions")
    .update(payload)
    .eq("transaction_id", transactionId)
    .eq("church_id", churchId);

  if (error) throw error;
}

export async function authorizeTransaction(
  supabase: SupabaseClient,
  churchId: number,
  transactionId: number,
  profileId: string,
  comments?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("sp_authorize_transaction", {
    p_church_id: churchId,
    p_transaction_id: transactionId,
    p_authorized_by_profile_id: profileId,
    p_authorization_status: "APPROVED",
    p_authorization_comments: comments?.trim() || null,
  });

  if (error) throw error;
}

export async function rejectTransaction(
  supabase: SupabaseClient,
  churchId: number,
  transactionId: number,
  profileId: string,
  comments?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("sp_authorize_transaction", {
    p_church_id: churchId,
    p_transaction_id: transactionId,
    p_authorized_by_profile_id: profileId,
    p_authorization_status: "REJECTED",
    p_authorization_comments: comments?.trim() || null,
  });

  if (error) throw error;
}

export async function deleteTransaction(
  supabase: SupabaseClient,
  churchId: number,
  transactionId: number,
): Promise<void> {
  const { data: existing, error: findError } = await supabase
    .from("transactions")
    .select("church_id, authorization_status")
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (findError) throw findError;

  const row = asRecord(existing);
  if (!row || Number(row.church_id) !== churchId) {
    throw new Error("Transacción no encontrada.");
  }

  if (String(row.authorization_status).toUpperCase() === "APPROVED") {
    throw new Error(
      "No se puede eliminar una transacción ya aprobada. Contacta al administrador.",
    );
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("transaction_id", transactionId)
    .eq("church_id", churchId);

  if (error) throw error;
}
