import {
  parseFamilyHouseholdDetailResponse,
  parseFamilyHouseholdListResponse,
  type FamilyHouseholdDetail,
  type FamilyHouseholdFilter,
  type FamilyHouseholdListPage,
} from "@/lib/reports/family-household";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchFamilyHouseholdsPage(
  supabase: SupabaseClient,
  churchId: number,
  opts: {
    search?: string | null;
    filter?: FamilyHouseholdFilter;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<FamilyHouseholdListPage> {
  const { data, error } = await supabase.rpc("sp_list_family_households", {
    p_church_id: churchId,
    p_search: opts.search?.trim() || null,
    p_filter: opts.filter ?? "all",
    p_page: opts.page ?? 1,
    p_page_size: opts.pageSize ?? 25,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo cargar el listado de familias.");
  return parseFamilyHouseholdListResponse(data);
}

export async function fetchFamilyHousehold(
  supabase: SupabaseClient,
  churchId: number,
  anchorProfileId: string,
): Promise<FamilyHouseholdDetail | null> {
  const { data, error } = await supabase.rpc("sp_get_family_household", {
    p_church_id: churchId,
    p_anchor_profile_id: anchorProfileId,
  });

  if (error) throw error;
  const row =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  if (row?.success === false) return null;
  assertRpcSuccess(data, "No se pudo cargar la ficha familiar.");
  return parseFamilyHouseholdDetailResponse(data);
}
