"use server";

import { churchPath } from "@/lib/apps/church-routes";
import type { ActionResult } from "@/app/apps/church/(console)/members/actions";
import {
  isGuardianRelationship,
  parseGuardiansJson,
} from "@/lib/children/parse";
import type { ChildProfileInput } from "@/lib/children/types";
import { maintainChildProfile } from "@/lib/services/children";
import { getActionSessionWith } from "@/lib/auth/permissions-server";
import { revalidatePath } from "next/cache";

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
  if (message.includes("tutor")) {
    return "children.errors.invalidGuardian";
  }
  return fallback;
}

function parseChildInput(formData: FormData): ChildProfileInput | null {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const childId = String(formData.get("childId") ?? "").trim() || undefined;
  const guardians = parseGuardiansJson(String(formData.get("guardians") ?? "[]"));

  if (!firstName) return null;
  if (!lastName) return null;
  if (!dateOfBirth) return null;
  if (guardians.length === 0) return null;

  for (const guardian of guardians) {
    if (!isGuardianRelationship(guardian.relationship)) return null;
  }

  return {
    childId,
    firstName,
    lastName,
    dateOfBirth,
    allergies: parseTagsJson(String(formData.get("allergies") ?? "[]")),
    emergencyContactName: String(formData.get("emergencyContactName") ?? "").trim(),
    emergencyContactPhone: String(
      formData.get("emergencyContactPhone") ?? "",
    ).trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    guardians,
  };
}

function revalidateChildrenPaths(childId?: string) {
  revalidatePath(churchPath("/members/children"));
  revalidatePath(churchPath("/members/profile"), "page");
  if (childId) {
    revalidatePath(churchPath(`/members/children/${childId}`));
  }
}

export async function saveChildAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const mode = String(formData.get("mode") ?? "new");
    const input = parseChildInput(formData);

    if (!input) {
      return { ok: false, errorKey: "children.errors.invalidForm" };
    }

    const action = mode === "edit" ? "update" : "insert";
    if (action === "update" && !input.childId) {
      return { ok: false, errorKey: "validation.invalidProfileId" };
    }

    const childId = await maintainChildProfile(
      supabase,
      session.churchId,
      input,
      action,
    );

    revalidateChildrenPaths(childId ?? input.childId);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      errorKey: toErrorKey(e, "children.errors.saveFailed"),
    };
  }
}

export async function deleteChildAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const childId = String(formData.get("childId") ?? "").trim();
    if (!childId) {
      return { ok: false, errorKey: "validation.invalidProfileId" };
    }

    await maintainChildProfile(
      supabase,
      session.churchId,
      {
        childId,
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        allergies: [],
        emergencyContactName: "",
        emergencyContactPhone: "",
        notes: "",
        guardians: [],
      },
      "delete",
    );

    revalidateChildrenPaths(childId);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      errorKey: toErrorKey(e, "children.errors.deleteFailed"),
    };
  }
}
