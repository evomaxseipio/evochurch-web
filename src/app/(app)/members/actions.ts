"use server";

import {
  normalizeGender,
  normalizeIdType,
  normalizeMaritalStatus,
} from "@/lib/members/catalogs";
import { mergeMemberFromInput } from "@/lib/members/merge";
import type {
  Member,
  MemberProfileInput,
  MembershipInput,
  MembershipRecord,
} from "@/lib/members/types";
import type { IncomeType } from "@/lib/contributions/types";
import type { Fund } from "@/lib/funds/types";
import { fetchIncomeTypes } from "@/lib/services/contributions";
import { fetchFunds } from "@/lib/services/funds";
import {
  fetchMemberById,
  fetchMembership,
  insertMember,
  saveMembership,
  updateMember,
} from "@/lib/services/members";
import { getActionSession } from "@/lib/auth/app-session";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; member?: Member; membership?: MembershipRecord | null }
  | { ok: false; error: string };

export type ContributionCatalogResult =
  | { ok: true; funds: Fund[]; incomeTypes: IncomeType[] }
  | { ok: false; error: string };

export async function fetchContributionCatalogAction(): Promise<ContributionCatalogResult> {
  try {
    const { supabase, session } = await getActionSession();
    const [funds, incomeTypes] = await Promise.all([
      fetchFunds(supabase, session.churchId),
      fetchIncomeTypes(supabase, session.churchId),
    ]);
    return { ok: true, funds, incomeTypes };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "No se pudieron cargar fondos y tipos de ingreso.",
    };
  }
}

async function sessionContext() {
  const { supabase, session } = await getActionSession();
  return { supabase, churchId: session.churchId };
}

function parseProfileInput(formData: FormData): MemberProfileInput {
  return {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    nickName: String(formData.get("nickName") ?? "").trim(),
    dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim(),
    gender: normalizeGender(String(formData.get("gender") ?? "")),
    maritalStatus: normalizeMaritalStatus(
      String(formData.get("maritalStatus") ?? ""),
    ),
    nationality: String(formData.get("nationality") ?? "").trim(),
    idType: normalizeIdType(String(formData.get("idType") ?? "")),
    idNumber: String(formData.get("idNumber") ?? "").trim(),
    isActive: formData.get("isActive") === "true",
    isMember: formData.get("isMember") === "true",
    bio: String(formData.get("bio") ?? "").trim(),
    membershipRole: String(formData.get("membershipRole") ?? "").trim(),
    streetAddress: String(formData.get("streetAddress") ?? "").trim(),
    stateProvince: String(formData.get("stateProvince") ?? "").trim(),
    cityState: String(formData.get("cityState") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    mobilePhone: String(formData.get("mobilePhone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
  };
}

function parseMembershipInput(formData: FormData): MembershipInput {
  return {
    profileId: String(formData.get("profileId") ?? "").trim(),
    baptismDate: String(formData.get("baptismDate") ?? "").trim(),
    baptismChurch: String(formData.get("baptismChurch") ?? "").trim(),
    baptismPastor: String(formData.get("baptismPastor") ?? "").trim(),
    membershipRole: String(formData.get("membershipRole") ?? "").trim(),
    baptismChurchCity: String(formData.get("baptismChurchCity") ?? "").trim(),
    baptismChurchCountry: String(
      formData.get("baptismChurchCountry") ?? "",
    ).trim(),
    hasCredential: formData.get("hasCredential") === "true",
    isBaptizedInSpirit: formData.get("isBaptizedInSpirit") === "true",
  };
}

function parseMembershipFormData(formData: FormData): MembershipInput & {
  isActive: boolean;
  isMember: boolean;
  bio: string;
} {
  return {
    ...parseMembershipInput(formData),
    isActive: formData.get("isActive") === "true",
    isMember: formData.get("isMember") === "true",
    bio: String(formData.get("bio") ?? "").trim(),
  };
}

function memberToProfileInput(
  member: Member,
  overrides: Partial<MemberProfileInput>,
): MemberProfileInput {
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    nickName: member.nickName,
    dateOfBirth: member.dateOfBirth,
    gender: member.gender,
    maritalStatus: member.maritalStatus,
    nationality: member.nationality,
    idType: member.idType,
    idNumber: member.idNumber,
    isActive: member.isActive,
    isMember: member.isMember,
    bio: member.bio,
    membershipRole: member.membershipRole,
    streetAddress: member.address.streetAddress,
    stateProvince: member.address.stateProvince,
    cityState: member.address.cityState,
    country: member.address.country,
    phone: member.contact.phone,
    mobilePhone: member.contact.mobilePhone,
    email: member.contact.email,
    ...overrides,
  };
}

export async function createMemberAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, churchId } = await sessionContext();
    const input = parseProfileInput(formData);

    if (!input.firstName || !input.lastName) {
      return { ok: false, error: "Nombre y apellido son obligatorios." };
    }

    await insertMember(supabase, churchId, input);
    revalidatePath("/members", "page");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo crear el miembro.",
    };
  }
}

export async function updateMemberAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, churchId } = await sessionContext();
    const memberId = String(formData.get("memberId") ?? "").trim();
    const input = parseProfileInput(formData);

    if (!memberId) {
      return { ok: false, error: "ID de miembro inválido." };
    }
    if (!input.firstName || !input.lastName) {
      return { ok: false, error: "Nombre y apellido son obligatorios." };
    }

    const before = await fetchMemberById(supabase, churchId, memberId);
    if (!before) {
      return { ok: false, error: "Miembro no encontrado." };
    }

    await updateMember(supabase, memberId, input);

    revalidatePath("/members", "page");
    revalidatePath("/members/profile", "page");

    const refreshed = await fetchMemberById(supabase, churchId, memberId);
    const member = mergeMemberFromInput(refreshed ?? before, input);

    return { ok: true, member };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo guardar el perfil.",
    };
  }
}

export async function saveMembershipAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, churchId } = await sessionContext();
    const input = parseMembershipFormData(formData);

    if (!input.profileId) {
      return { ok: false, error: "ID de perfil inválido." };
    }

    const before = await fetchMemberById(supabase, churchId, input.profileId);
    if (!before) {
      return { ok: false, error: "Miembro no encontrado." };
    }

    await saveMembership(supabase, input);

    const profileInput = memberToProfileInput(before, {
      isActive: input.isActive,
      isMember: input.isMember,
      bio: input.bio,
      membershipRole: input.membershipRole || before.membershipRole,
    });
    await updateMember(supabase, input.profileId, profileInput);

    revalidatePath("/members", "page");
    revalidatePath("/members/profile", "page");

    const [membership, refreshed] = await Promise.all([
      fetchMembership(supabase, churchId, input.profileId).catch(() => null),
      fetchMemberById(supabase, churchId, input.profileId),
    ]);

    const member = mergeMemberFromInput(refreshed ?? before, profileInput);

    return {
      ok: true,
      membership,
      member,
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo guardar la membresía.",
    };
  }
}
