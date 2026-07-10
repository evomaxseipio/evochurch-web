"use server";

import {
  normalizeGender,
  normalizeIdType,
  normalizeMaritalStatus,
} from "@/lib/members/catalogs";
import {
  findMemberRoleById,
  type MemberRoleCatalog,
} from "@/lib/members/roles";
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
  fetchMemberRoles,
  fetchMembership,
  insertMember,
  saveMembership,
  updateMember,
} from "@/lib/services/members";
import { getActionSessionWith } from "@/lib/auth/permissions-server";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; member?: Member; membership?: MembershipRecord | null }
  | { ok: false; errorKey: string };

export type ContributionCatalogResult =
  | { ok: true; funds: Fund[]; incomeTypes: IncomeType[] }
  | { ok: false; errorKey: string };

function toErrorKey(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("unauthorized") || message.includes("not authorized")) {
    return "errors.unauthorized";
  }
  if (message.includes("forbidden") || message.includes("permission")) {
    return "errors.forbidden";
  }
  if (message.includes("not found")) {
    return "errors.notFound";
  }
  if (message.includes("session")) {
    return "errors.sessionInvalid";
  }
  return fallback;
}

export async function fetchContributionCatalogAction(): Promise<ContributionCatalogResult> {
  try {
    const { supabase, session } = await getActionSessionWith(
      "finances:contributions:write",
    );
    const [funds, incomeTypes] = await Promise.all([
      fetchFunds(supabase, session.churchId),
      fetchIncomeTypes(supabase, session.churchId),
    ]);
    return { ok: true, funds, incomeTypes };
  } catch (e) {
    return {
      ok: false,
      errorKey: toErrorKey(e, "errors.loadFailed"),
    };
  }
}

async function sessionContext() {
  const { supabase, session } = await getActionSessionWith("members:write");
  return { supabase, churchId: session.churchId };
}

function parseTagsJson(raw: string): string[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function parseProfileInput(
  formData: FormData,
  roles: MemberRoleCatalog[] = [],
): MemberProfileInput {
  const membershipRoleId = String(formData.get("membershipRoleId") ?? "").trim();
  const role = findMemberRoleById(roles, membershipRoleId);
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
    membershipRoleId,
    membershipRole: role?.roleName ?? "",
    streetAddress: String(formData.get("streetAddress") ?? "").trim(),
    stateProvince: String(formData.get("stateProvince") ?? "").trim(),
    cityState: String(formData.get("cityState") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    mobilePhone: String(formData.get("mobilePhone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    bloodType: String(formData.get("bloodType") ?? "").trim(),
    allergies: parseTagsJson(String(formData.get("allergies") ?? "[]")),
  };
}

function parseMembershipInput(formData: FormData): MembershipInput {
  const membershipRoleId = String(formData.get("membershipRoleId") ?? "").trim();
  return {
    profileId: String(formData.get("profileId") ?? "").trim(),
    baptismDate: String(formData.get("baptismDate") ?? "").trim(),
    baptismChurch: String(formData.get("baptismChurch") ?? "").trim(),
    baptismPastor: String(formData.get("baptismPastor") ?? "").trim(),
    membershipRoleId,
    baptismChurchCity: String(formData.get("baptismChurchCity") ?? "").trim(),
    baptismChurchCountry: String(
      formData.get("baptismChurchCountry") ?? "",
    ).trim(),
    hasCredential: formData.get("hasCredential") === "true",
    isBaptizedInSpirit: formData.get("isBaptizedInSpirit") === "true",
  };
}

function parseMembershipFormData(
  formData: FormData,
  roles: MemberRoleCatalog[] = [],
): MembershipInput & {
  isActive: boolean;
  isMember: boolean;
  bio: string;
  membershipRole: string;
} {
  const membership = parseMembershipInput(formData);
  return {
    ...membership,
    membershipRole:
      findMemberRoleById(roles, membership.membershipRoleId)?.roleName ?? "",
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
    membershipRoleId: member.membershipRoleId,
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
      return { ok: false, errorKey: "validation.firstNameRequired" };
    }

    await insertMember(supabase, churchId, input);
    revalidatePath("/members", "page");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      errorKey: toErrorKey(e, "errors.saveFailed"),
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
      return { ok: false, errorKey: "validation.invalidMemberId" };
    }
    if (!input.firstName || !input.lastName) {
      return { ok: false, errorKey: "validation.firstNameRequired" };
    }

    const before = await fetchMemberById(supabase, churchId, memberId);
    if (!before) {
      return { ok: false, errorKey: "errors.memberNotFound" };
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
      errorKey: toErrorKey(e, "errors.saveFailed"),
    };
  }
}

export async function saveMembershipAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, churchId } = await sessionContext();
    const roles = await fetchMemberRoles(supabase).catch(() => []);
    const input = parseMembershipFormData(formData, roles);

    if (!input.profileId) {
      return { ok: false, errorKey: "validation.invalidProfileId" };
    }

    const before = await fetchMemberById(supabase, churchId, input.profileId);
    if (!before) {
      return { ok: false, errorKey: "errors.memberNotFound" };
    }

    await saveMembership(supabase, input);

    const profileInput = memberToProfileInput(before, {
      isActive: input.isActive,
      isMember: input.isMember,
      bio: input.bio,
      membershipRoleId: input.membershipRoleId || before.membershipRoleId,
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
      errorKey: toErrorKey(e, "errors.saveFailed"),
    };
  }
}

export async function deleteMemberAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:delete");
    const profileId = String(formData.get("profileId") ?? "").trim();
    if (!profileId) {
      return { ok: false, errorKey: "validation.invalidProfileId" };
    }

    const before = await fetchMemberById(supabase, session.churchId, profileId);
    if (!before) {
      return { ok: false, errorKey: "errors.memberNotFound" };
    }

    const profileInput = memberToProfileInput(before, {
      isActive: false,
      isMember: false,
    });

    await updateMember(supabase, profileId, profileInput);

    revalidatePath("/members", "page");
    revalidatePath("/members/profile", "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.deleteFailed") };
  }
}
