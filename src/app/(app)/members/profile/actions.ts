"use server";

import { mergeMemberFromInput } from "@/lib/members/merge";
import type { Member, MemberProfileInput, ProfileEmploymentInput } from "@/lib/members/types";
import {
  fetchMemberById,
  maintainProfileEmployment,
  updateMember,
} from "@/lib/services/members";
import { getActionSessionWith } from "@/lib/auth/permissions-server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/(app)/members/actions";

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

function memberToProfileInput(member: Member): MemberProfileInput {
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
  };
}

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

export async function saveMemberHealthAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const memberId = String(formData.get("memberId") ?? "").trim();
    if (!memberId) {
      return { ok: false, errorKey: "validation.invalidMemberId" };
    }

    const before = await fetchMemberById(supabase, session.churchId, memberId);
    if (!before) {
      return { ok: false, errorKey: "errors.memberNotFound" };
    }

    const input: MemberProfileInput = {
      ...memberToProfileInput(before),
      bloodType: String(formData.get("bloodType") ?? "").trim(),
      allergies: parseTagsJson(String(formData.get("allergies") ?? "[]")),
    };

    await updateMember(supabase, memberId, input);
    revalidatePath("/members", "page");
    revalidatePath("/members/profile", "page");

    const refreshed = await fetchMemberById(supabase, session.churchId, memberId);
    const member = mergeMemberFromInput(refreshed ?? before, input);
    return { ok: true, member };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.saveFailed") };
  }
}

export async function saveMemberProfessionsAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const memberId = String(formData.get("memberId") ?? "").trim();
    if (!memberId) {
      return { ok: false, errorKey: "validation.invalidMemberId" };
    }

    const before = await fetchMemberById(supabase, session.churchId, memberId);
    if (!before) {
      return { ok: false, errorKey: "errors.memberNotFound" };
    }

    const input: MemberProfileInput = {
      ...memberToProfileInput(before),
      professions: parseTagsJson(String(formData.get("professions") ?? "[]")),
    };

    await updateMember(supabase, memberId, input);
    revalidatePath("/members", "page");
    revalidatePath("/members/profile", "page");

    const refreshed = await fetchMemberById(supabase, session.churchId, memberId);
    const member = mergeMemberFromInput(refreshed ?? before, input);
    return { ok: true, member };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.saveFailed") };
  }
}

export async function saveMemberEmploymentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const profileId = String(formData.get("profileId") ?? "").trim();
    if (!profileId) {
      return { ok: false, errorKey: "validation.invalidProfileId" };
    }

    const before = await fetchMemberById(supabase, session.churchId, profileId);
    if (!before) {
      return { ok: false, errorKey: "errors.memberNotFound" };
    }

    const input: ProfileEmploymentInput = {
      profileId,
      employmentId: String(formData.get("employmentId") ?? "").trim() || undefined,
      employerName: String(formData.get("employerName") ?? "").trim(),
      jobTitle: String(formData.get("jobTitle") ?? "").trim(),
      sector: String(formData.get("sector") ?? "").trim(),
      workPhone: String(formData.get("workPhone") ?? "").trim(),
      workEmail: String(formData.get("workEmail") ?? "").trim(),
      startDate: String(formData.get("startDate") ?? "").trim(),
      endDate: String(formData.get("endDate") ?? "").trim() || undefined,
      notes: String(formData.get("notes") ?? "").trim(),
    };

    const action = String(formData.get("employmentAction") ?? "upsert_primary");
    if (action === "delete") {
      if (!input.employmentId) {
        return { ok: false, errorKey: "validation.invalidEmploymentId" };
      }
      await maintainProfileEmployment(
        supabase,
        session.churchId,
        "delete",
        input,
      );
    } else if (action === "upsert_history") {
      await maintainProfileEmployment(
        supabase,
        session.churchId,
        "upsert_history",
        input,
      );
    } else {
      await maintainProfileEmployment(
        supabase,
        session.churchId,
        "upsert_primary",
        input,
      );
    }

    revalidatePath("/members/profile", "page");

    const refreshed = await fetchMemberById(supabase, session.churchId, profileId);
    return { ok: true, member: refreshed ?? before };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.saveFailed") };
  }
}
