import {
  parseChildProfileResponse,
  parseChildrenListResponse,
} from "@/lib/children/parse";
import type {
  ChildProfile,
  ChildProfileInput,
  ChildrenListResult,
} from "@/lib/children/types";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FetchChildrenPageParams = {
  churchId: number;
  page?: number;
  pageSize?: number;
  search?: string | null;
};

export async function fetchChildrenPage(
  supabase: SupabaseClient,
  params: FetchChildrenPageParams,
): Promise<ChildrenListResult> {
  const { data, error } = await supabase.rpc("sp_list_child_profiles", {
    p_church_id: params.churchId,
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 25,
    p_search: params.search?.trim() || null,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudieron cargar los niños.");
  return parseChildrenListResponse(data);
}

export async function fetchChildById(
  supabase: SupabaseClient,
  churchId: number,
  childId: string,
): Promise<ChildProfile | null> {
  const { data, error } = await supabase.rpc("sp_get_child_profile", {
    p_child_id: childId,
    p_church_id: churchId,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo cargar el perfil del niño.");
  return parseChildProfileResponse(data);
}

export async function maintainChildProfile(
  supabase: SupabaseClient,
  churchId: number,
  input: ChildProfileInput,
  action: "insert" | "update" | "delete",
): Promise<string | undefined> {
  const { data, error } = await supabase.rpc("sp_maintain_child_profile", {
    p_church_id: churchId,
    p_action: action,
    p_child_id: input.childId ?? null,
    p_first_name: action === "delete" ? null : input.firstName,
    p_last_name: action === "delete" ? null : input.lastName,
    p_date_of_birth: action === "delete" ? null : input.dateOfBirth || null,
    p_allergies:
      action === "delete" ? null : (input.allergies ?? []),
    p_emergency_contact_name:
      action === "delete" ? null : input.emergencyContactName || null,
    p_emergency_contact_phone:
      action === "delete" ? null : input.emergencyContactPhone || null,
    p_notes: action === "delete" ? null : input.notes || null,
    p_guardians: action === "delete" ? null : input.guardians,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo guardar el registro del niño.");

  const root =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  const childId = root?.child_id ?? root?.childId;
  return childId != null ? String(childId) : input.childId;
}
