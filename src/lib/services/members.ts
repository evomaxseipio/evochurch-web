import { DEFAULT_MEMBERS_PAGE_SIZE } from "@/lib/members/pagination";
import type { MemberRoleCatalog } from "@/lib/members/roles";
import {
  parseMember,
  parseMembersPageResponse,
  parseMembershipResponse,
} from "@/lib/members/parse";
import type {
  Member,
  MemberFilterKey,
  MemberProfileInput,
  MembersPageResult,
  MembershipInput,
  MembershipRecord,
} from "@/lib/members/types";
import { catalogTags } from "@/lib/cache/catalog-tags";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

export type FetchMembersPageParams = {
  churchId: number;
  page?: number;
  pageSize?: number | null;
  filter?: MemberFilterKey;
  search?: string | null;
};

/** Siempre usa la sobrecarga paginada (PostgREST no resuelve spgetprofiles() sin args). */
function resolveMembersPageSize(
  pageSize: number | null | undefined,
): number | null {
  if (pageSize === null) return null;
  if (pageSize === undefined) return DEFAULT_MEMBERS_PAGE_SIZE;
  return pageSize;
}

export async function fetchMembersPage(
  supabase: SupabaseClient,
  params: FetchMembersPageParams,
): Promise<MembersPageResult> {
  const { data, error } = await supabase.rpc("spgetprofiles", {
    p_church_id: params.churchId,
    p_page: params.page ?? 1,
    p_page_size: resolveMembersPageSize(params.pageSize),
    p_filter: params.filter ?? "all",
    p_search: params.search?.trim() || null,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudieron cargar los miembros.");
  return parseMembersPageResponse(data);
}

/** @deprecated Usar fetchMembersPage */
export async function fetchMembers(
  supabase: SupabaseClient,
  churchId: number,
): Promise<Member[]> {
  const result = await fetchMembersPage(supabase, {
    churchId,
    page: 1,
    pageSize: null,
  });
  return result.members;
}

export async function fetchMemberById(
  supabase: SupabaseClient,
  _churchId: number,
  memberId: string,
): Promise<Member | null> {
  const { data, error } = await supabase.rpc("sp_get_profile_by_id", {
    p_profile_id: memberId,
  });

  if (error) throw error;

  const root =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;

  if (!root || root.success === false) return null;
  return parseMember(root.member);
}

export async function fetchMemberRoles(
  supabase: SupabaseClient,
): Promise<MemberRoleCatalog[]> {
  return unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from("member_roles")
        .select("id, role_name, role_code")
        .order("role_name", { ascending: true });

      if (error) throw error;

      return ((data as { id: string; role_name: string; role_code: string }[]) ?? [])
        .map((r) => ({
          id: r.id,
          roleName: r.role_name?.trim() ?? "",
          roleCode: r.role_code?.trim() ?? "",
        }))
        .filter((r) => r.id && r.roleName);
    },
    ["catalog:member-roles"],
    { tags: [catalogTags.memberRoles()], revalidate: 3600 },
  )();
}

export async function insertMember(
  supabase: SupabaseClient,
  churchId: number,
  input: MemberProfileInput,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("spinsertprofiles", {
    p_church_id: churchId,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_nick_name: input.nickName || null,
    p_date_of_birth: input.dateOfBirth || null,
    p_gender: input.gender || null,
    p_marital_status: input.maritalStatus || null,
    p_nationality: input.nationality || null,
    p_id_type: input.idType || null,
    p_id_number: input.idNumber || null,
    p_is_member: input.isMember,
    p_is_active: input.isActive,
    p_bio: input.bio || null,
    p_street_address: input.streetAddress || null,
    p_state_province: input.stateProvince || null,
    p_city_state: input.cityState || null,
    p_country: input.country || null,
    p_phone: input.phone || null,
    p_mobile_phone: input.mobilePhone || null,
    p_email: input.email || null,
  });

  if (error) throw error;
  const result = (data as Record<string, unknown>) ?? {};
  assertRpcSuccess(result, "No se pudo crear el miembro.");
  return result;
}

export async function updateMember(
  supabase: SupabaseClient,
  memberId: string,
  input: MemberProfileInput,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("spupdateprofiles", {
    p_id: memberId,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_nick_name: input.nickName || null,
    p_date_of_birth: input.dateOfBirth || null,
    p_gender: input.gender || null,
    p_marital_status: input.maritalStatus || null,
    p_nationality: input.nationality || null,
    p_id_type: input.idType || null,
    p_id_number: input.idNumber || null,
    p_is_member: input.isMember,
    p_is_active: input.isActive,
    p_bio: input.bio || null,
    p_street_address: input.streetAddress || null,
    p_state_province: input.stateProvince || null,
    p_city_state: input.cityState || null,
    p_country: input.country || null,
    p_phone: input.phone || null,
    p_mobile_phone: input.mobilePhone || null,
    p_email: input.email || null,
  });

  if (error) throw error;
  return (data as Record<string, unknown>) ?? {};
}

export async function fetchMembership(
  supabase: SupabaseClient,
  churchId: number,
  profileId: string,
): Promise<MembershipRecord | null> {
  const { data, error } = await supabase.rpc(
    "sp_get_membership_history_by_profile",
    {
      p_church_id: churchId,
      p_profile_id: profileId,
    },
  );

  if (error) throw error;
  return parseMembershipResponse(data);
}

export async function saveMembership(
  supabase: SupabaseClient,
  input: MembershipInput,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("spmaintancemembership", {
    p_profile_id: input.profileId,
    p_baptism_date: input.baptismDate || null,
    p_baptism_church: input.baptismChurch || null,
    p_baptism_pastor: input.baptismPastor || null,
    p_member_role_id: input.membershipRoleId || null,
    p_baptism_church_city: input.baptismChurchCity || null,
    p_baptism_church_country: input.baptismChurchCountry || null,
    p_has_credential: input.hasCredential,
    p_is_baptized_in_spirit: input.isBaptizedInSpirit,
  });

  if (error) throw error;
  const result = (data as Record<string, unknown>) ?? {};
  assertRpcSuccess(result, "No se pudo guardar la membresía.");
  return result;
}
