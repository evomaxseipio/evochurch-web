"use server";
import { churchPath } from "@/lib/apps/church-routes";

import { mergeMemberFromInput } from "@/lib/members/merge";
import { maintainProfilePastoralEvent } from "@/lib/services/pastoral-events";
import {
  isPastoralEventType,
  type PastoralEventInput,
} from "@/lib/members/pastoral-events";
import type { Member, MemberProfileInput, ProfileEmploymentInput } from "@/lib/members/types";
import {
  fetchMemberById,
  maintainProfileEmployment,
  updateMember,
} from "@/lib/services/members";
import { getActionSessionWith } from "@/lib/auth/permissions-server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/apps/church/(console)/members/actions";

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

export async function saveMemberLaborAction(
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

    const professions = parseTagsJson(String(formData.get("professions") ?? "[]"));
    const profileInput: MemberProfileInput = {
      ...memberToProfileInput(before),
      professions,
    };
    await updateMember(supabase, profileId, profileInput);

    const employmentInput: ProfileEmploymentInput = {
      profileId,
      employmentId: String(formData.get("employmentId") ?? "").trim() || undefined,
      employerName: String(formData.get("employerName") ?? "").trim(),
      jobTitle: String(formData.get("jobTitle") ?? "").trim(),
      sector: String(formData.get("sector") ?? "").trim(),
      workPhone: String(formData.get("workPhone") ?? "").trim(),
      workEmail: String(formData.get("workEmail") ?? "").trim(),
      startDate: String(formData.get("startDate") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
    };

    const hasEmploymentData =
      employmentInput.employerName ||
      employmentInput.jobTitle ||
      employmentInput.sector ||
      employmentInput.workPhone ||
      employmentInput.workEmail ||
      employmentInput.startDate ||
      employmentInput.notes ||
      employmentInput.employmentId;

    if (hasEmploymentData) {
      await maintainProfileEmployment(
        supabase,
        session.churchId,
        "upsert_primary",
        employmentInput,
      );
    }

    revalidatePath(churchPath("/members"), "page");
    revalidatePath(churchPath("/members/profile"), "page");

    const refreshed = await fetchMemberById(supabase, session.churchId, profileId);
    let member = mergeMemberFromInput(refreshed ?? before, profileInput);
    if (refreshed) member = refreshed;
    return { ok: true, member };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.saveFailed") };
  }
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
    revalidatePath(churchPath("/members"), "page");
    revalidatePath(churchPath("/members/profile"), "page");

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
    revalidatePath(churchPath("/members"), "page");
    revalidatePath(churchPath("/members/profile"), "page");

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

    revalidatePath(churchPath("/members/profile"), "page");

    const refreshed = await fetchMemberById(supabase, session.churchId, profileId);
    return { ok: true, member: refreshed ?? before };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.saveFailed") };
  }
}

function parsePastoralEventForm(formData: FormData): PastoralEventInput | null {
  const profileId = String(formData.get("profileId") ?? "").trim();
  const eventType = String(formData.get("eventType") ?? "").trim();
  if (!profileId || !isPastoralEventType(eventType)) return null;

  return {
    profileId,
    eventId: String(formData.get("eventId") ?? "").trim() || undefined,
    eventType,
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    eventDate: String(formData.get("eventDate") ?? "").trim(),
    needsFollowUp: formData.get("needsFollowUp") === "on",
  };
}

export async function savePastoralEventAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const input = parsePastoralEventForm(formData);
    if (!input?.eventDate) {
      return { ok: false, errorKey: "validation.invalidEventDate" };
    }

    const action = input.eventId ? "update" : "insert";
    await maintainProfilePastoralEvent(supabase, session.churchId, input, action);

    revalidatePath(churchPath("/members/profile"), "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.saveFailed") };
  }
}

export async function deletePastoralEventAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const profileId = String(formData.get("profileId") ?? "").trim();
    const eventId = String(formData.get("eventId") ?? "").trim();
    if (!profileId || !eventId) {
      return { ok: false, errorKey: "validation.invalidEventId" };
    }

    await maintainProfilePastoralEvent(
      supabase,
      session.churchId,
      {
        profileId,
        eventId,
        eventType: "other",
        title: "",
        description: "",
        eventDate: "1970-01-01",
        needsFollowUp: false,
      },
      "delete",
    );

    revalidatePath(churchPath("/members/profile"), "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.deleteFailed") };
  }
}

export async function linkSpouseAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const profileId = String(formData.get("profileId") ?? "").trim();
    const spouseProfileId = String(formData.get("spouseProfileId") ?? "").trim();
    if (!profileId || !spouseProfileId) {
      return { ok: false, errorKey: "validation.invalidProfileId" };
    }

    const { linkProfileSpouse } = await import("@/lib/services/member-family");
    await linkProfileSpouse(
      supabase,
      session.churchId,
      profileId,
      spouseProfileId,
    );

    revalidatePath(churchPath("/members/profile"), "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.saveFailed") };
  }
}

export async function unlinkSpouseAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const profileId = String(formData.get("profileId") ?? "").trim();
    if (!profileId) {
      return { ok: false, errorKey: "validation.invalidProfileId" };
    }

    const { unlinkProfileSpouse } = await import("@/lib/services/member-family");
    await unlinkProfileSpouse(supabase, session.churchId, profileId);

    revalidatePath(churchPath("/members/profile"), "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.saveFailed") };
  }
}

export async function linkParentChildAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const parentProfileId = String(formData.get("parentProfileId") ?? "").trim();
    const childProfileId = String(formData.get("childProfileId") ?? "").trim();
    const relationship = String(formData.get("familyRelationship") ?? "child").trim();

    if (!parentProfileId || !childProfileId) {
      return { ok: false, errorKey: "validation.invalidProfileId" };
    }

    const { linkParentChild } = await import("@/lib/services/member-family");
    await linkParentChild(
      supabase,
      session.churchId,
      parentProfileId,
      childProfileId,
      relationship,
    );

    revalidatePath(churchPath("/members/profile"), "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.saveFailed") };
  }
}

export async function unlinkParentChildAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const parentProfileId = String(formData.get("parentProfileId") ?? "").trim();
    const childProfileId = String(formData.get("childProfileId") ?? "").trim();

    if (!parentProfileId || !childProfileId) {
      return { ok: false, errorKey: "validation.invalidProfileId" };
    }

    const { unlinkParentChild } = await import("@/lib/services/member-family");
    await unlinkParentChild(
      supabase,
      session.churchId,
      parentProfileId,
      childProfileId,
    );

    revalidatePath(churchPath("/members/profile"), "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, errorKey: toErrorKey(e, "errors.saveFailed") };
  }
}
