import { parseMemberFamilyResponse, type MemberFamilyData } from "@/lib/members/family";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchMemberFamily(
  supabase: SupabaseClient,
  churchId: number,
  profileId: string,
): Promise<MemberFamilyData> {
  const { data, error } = await supabase.rpc("sp_get_member_family", {
    p_profile_id: profileId,
    p_church_id: churchId,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo cargar la familia del miembro.");
  return parseMemberFamilyResponse(data);
}

export async function linkProfileSpouse(
  supabase: SupabaseClient,
  churchId: number,
  profileId: string,
  spouseProfileId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_link_profile_spouse", {
    p_profile_id: profileId,
    p_spouse_profile_id: spouseProfileId,
    p_church_id: churchId,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo vincular el cónyuge.");
}

export async function unlinkProfileSpouse(
  supabase: SupabaseClient,
  churchId: number,
  profileId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_unlink_profile_spouse", {
    p_profile_id: profileId,
    p_church_id: churchId,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo desvincular el cónyuge.");
}

export async function linkParentChild(
  supabase: SupabaseClient,
  churchId: number,
  parentProfileId: string,
  childProfileId: string,
  relationship: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_link_parent_child", {
    p_parent_profile_id: parentProfileId,
    p_child_profile_id: childProfileId,
    p_church_id: churchId,
    p_relationship: relationship,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo vincular el hijo/a.");
}

export async function unlinkParentChild(
  supabase: SupabaseClient,
  churchId: number,
  parentProfileId: string,
  childProfileId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_unlink_parent_child", {
    p_parent_profile_id: parentProfileId,
    p_child_profile_id: childProfileId,
    p_church_id: churchId,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo desvincular el hijo/a.");
}
