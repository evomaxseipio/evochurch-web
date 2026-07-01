import type { SupabaseClient } from "@supabase/supabase-js";
import type { FundTransferInput } from "@/lib/ledger/types";

function parseRpcError(data: unknown, error: { message: string } | null): void {
  if (error) throw new Error(error.message);
  const root = data as Record<string, unknown> | null;
  if (root?.success === false) {
    throw new Error(String(root.message ?? "Error en transferencia."));
  }
}

export async function createFundTransfer(
  supabase: SupabaseClient,
  churchId: number,
  profileId: string,
  input: FundTransferInput,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_create_fund_transfer", {
    p_church_id: churchId,
    p_source_fund_id: input.sourceFundId,
    p_destination_fund_id: input.destinationFundId,
    p_amount: input.amount,
    p_user_comment: input.userComment?.trim() || null,
    p_payment_method: input.paymentMethod,
    p_movement_date: input.movementDate,
    p_created_by_profile_id: profileId,
  });

  parseRpcError(data, error);
}

export async function updateFundTransfer(
  supabase: SupabaseClient,
  churchId: number,
  input: FundTransferInput,
): Promise<void> {
  const transferId = input.transferId?.trim();
  if (!transferId) throw new Error("Transferencia no válida.");

  const { data, error } = await supabase.rpc("sp_update_fund_transfer", {
    p_church_id: churchId,
    p_transfer_id: transferId,
    p_source_fund_id: input.sourceFundId,
    p_destination_fund_id: input.destinationFundId,
    p_amount: input.amount,
    p_user_comment: input.userComment?.trim() || null,
    p_payment_method: input.paymentMethod,
    p_movement_date: input.movementDate,
  });

  parseRpcError(data, error);
}

export async function authorizeFundTransfer(
  supabase: SupabaseClient,
  churchId: number,
  transferId: string,
  profileId: string,
  authUserId: string,
  comments?: string | null,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_authorize_fund_transfer", {
    p_church_id: churchId,
    p_transfer_id: transferId,
    p_authorized_by_profile_id: profileId,
    p_auth_user_id: authUserId,
    p_authorization_comments: comments?.trim() || null,
  });

  parseRpcError(data, error);
}

export async function rejectFundTransfer(
  supabase: SupabaseClient,
  churchId: number,
  transferId: string,
  profileId: string,
  authUserId: string,
  comments?: string | null,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_reject_fund_transfer", {
    p_church_id: churchId,
    p_transfer_id: transferId,
    p_authorized_by_profile_id: profileId,
    p_auth_user_id: authUserId,
    p_authorization_comments: comments?.trim() || null,
  });

  parseRpcError(data, error);
}

export async function deleteFundTransfer(
  supabase: SupabaseClient,
  churchId: number,
  transferId: string,
): Promise<void> {
  const { data: row, error: findError } = await supabase
    .from("fund_transfers")
    .select("expense_transaction_id, status, income_id")
    .eq("transfer_id", transferId)
    .eq("church_id", churchId)
    .maybeSingle();

  if (findError) throw findError;
  if (!row) throw new Error("Transferencia no encontrada.");
  if (row.status !== "PENDING") {
    throw new Error("Solo se pueden eliminar transferencias pendientes.");
  }

  const { error: deleteTransferError } = await supabase
    .from("fund_transfers")
    .delete()
    .eq("transfer_id", transferId)
    .eq("church_id", churchId);

  if (deleteTransferError) throw deleteTransferError;

  const { error: deleteTxError } = await supabase
    .from("transactions")
    .delete()
    .eq("transaction_id", row.expense_transaction_id)
    .eq("church_id", churchId);

  if (deleteTxError) throw deleteTxError;
}
