import { parseFundsResponse } from "@/lib/funds/parse";
import type { Fund, FundInput } from "@/lib/funds/types";
import { catalogTags } from "@/lib/cache/catalog-tags";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

export async function fetchFunds(
  supabase: SupabaseClient,
  churchId: number,
): Promise<Fund[]> {
  return unstable_cache(
    async () => {
      const { data, error } = await supabase.rpc("spgetfunds", {
        p_church_id: churchId,
      });

      if (error) throw error;
      return parseFundsResponse(data);
    },
    ["catalog:funds", String(churchId)],
    { tags: [catalogTags.funds(churchId)], revalidate: 300 },
  )();
}

export async function saveFund(
  supabase: SupabaseClient,
  churchId: number,
  input: FundInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("sp_maintance_funds", {
    p_fund_id: input.fundId ?? null,
    p_church_id: churchId,
    p_fund_name: input.name,
    p_description: input.description || null,
    p_target_amount: input.targetAmount,
    p_start_date: input.startDate,
    p_end_date: input.endDate || null,
    p_is_active: input.isActive,
    p_is_primary: input.isPrimary,
    p_total_contributions: input.totalContributions,
    p_ministry_id: input.ministryId ?? null,
    p_fund_kind: input.fundKind ?? "operating",
  });

  if (error) {
    throw new Error(
      error.message ||
        error.details ||
        "No se pudo guardar el fondo (RPC sp_maintance_funds).",
    );
  }
  const row = (data as Record<string, unknown>) ?? {};
  assertRpcSuccess(row, "No se pudo guardar el fondo.");
  return String(row.fund_id ?? input.fundId ?? "");
}

export async function deleteFund(
  supabase: SupabaseClient,
  churchId: number,
  fundId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_delete_fund", {
    p_fund_id: fundId,
    p_church_id: churchId,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo eliminar el fondo.");
}

export async function setPrimaryFund(
  supabase: SupabaseClient,
  churchId: number,
  fundId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_change_primary_fund", {
    p_fund_id: fundId,
    p_church_id: churchId,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo marcar el fondo como primario.");
}

export async function setMinistryDefaultFund(
  supabase: SupabaseClient,
  churchId: number,
  ministryId: string,
  fundId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_set_ministry_default_fund", {
    p_church_id: churchId,
    p_ministry_id: ministryId,
    p_fund_id: fundId,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo establecer el fondo principal del ministerio.");
}
