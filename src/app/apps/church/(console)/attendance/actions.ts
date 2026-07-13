"use server";

import { churchPath } from "@/lib/apps/church-routes";
import {
  activityTypeRequiresMinistry,
  isAttendanceActivityType,
  isAttendanceStatus,
  type AttendanceRecordInput,
  type AttendanceSessionInput,
  type AttendanceStatus,
} from "@/lib/attendance/types";
import { getActionSessionWith } from "@/lib/auth/permissions-server";
import {
  maintainAttendanceSession,
  setAttendanceRecords,
} from "@/lib/services/attendance";
import { revalidatePath } from "next/cache";

export type AttendanceActionResult =
  | { ok: true; sessionId?: string }
  | { ok: false; errorKey: string };

function toErrorKey(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("unauthorized") || message.includes("not authorized")) {
    return "errors.unauthorized";
  }
  if (message.includes("forbidden") || message.includes("permission")) {
    return "errors.forbidden";
  }
  if (message.includes("not found") || message.includes("no encontrada")) {
    return "errors.notFound";
  }
  if (message.includes("ministry")) {
    return "attendance.errors.ministryRequired";
  }
  if (message.includes("session")) {
    return "errors.sessionInvalid";
  }
  return fallback;
}

function revalidateAttendance(sessionId?: string | null) {
  revalidatePath(churchPath("/attendance"));
  if (sessionId) {
    revalidatePath(churchPath(`/attendance/${sessionId}`));
  }
}

function parseSessionInput(formData: FormData): AttendanceSessionInput | null {
  const sessionDate = String(formData.get("sessionDate") ?? "").trim();
  const activityRaw = String(formData.get("activityType") ?? "").trim();
  const ministryRaw = String(formData.get("ministryId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim() || undefined;
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!sessionDate || !isAttendanceActivityType(activityRaw)) return null;

  const ministryId = ministryRaw || null;
  if (activityTypeRequiresMinistry(activityRaw) && !ministryId) return null;

  return {
    sessionId,
    sessionDate,
    activityType: activityRaw,
    ministryId,
    title,
    notes,
  };
}

export async function saveAttendanceSessionAction(
  _prev: AttendanceActionResult | null,
  formData: FormData,
): Promise<AttendanceActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("attendance:write");
    const mode = String(formData.get("mode") ?? "new");
    const input = parseSessionInput(formData);

    if (!input) {
      return { ok: false, errorKey: "attendance.errors.invalidForm" };
    }

    const action = mode === "edit" ? "update" : "insert";
    if (action === "update" && !input.sessionId) {
      return { ok: false, errorKey: "attendance.errors.invalidForm" };
    }

    const sessionId = await maintainAttendanceSession(
      supabase,
      session.churchId,
      input,
      action,
    );

    revalidateAttendance(sessionId);
    return { ok: true, sessionId: sessionId ?? undefined };
  } catch (e) {
    return {
      ok: false,
      errorKey: toErrorKey(e, "attendance.errors.saveFailed"),
    };
  }
}

export async function deleteAttendanceSessionAction(
  _prev: AttendanceActionResult | null,
  formData: FormData,
): Promise<AttendanceActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("attendance:write");
    const sessionId = String(formData.get("sessionId") ?? "").trim();
    if (!sessionId) {
      return { ok: false, errorKey: "attendance.errors.invalidForm" };
    }

    await maintainAttendanceSession(
      supabase,
      session.churchId,
      {
        sessionId,
        sessionDate: "",
        activityType: "house_group",
        ministryId: null,
      },
      "delete",
    );

    revalidateAttendance(sessionId);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      errorKey: toErrorKey(e, "attendance.errors.deleteFailed"),
    };
  }
}

export async function saveAttendanceRecordsAction(
  _prev: AttendanceActionResult | null,
  formData: FormData,
): Promise<AttendanceActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("attendance:write");
    const sessionId = String(formData.get("sessionId") ?? "").trim();
    const raw = String(formData.get("recordsJson") ?? "").trim();

    if (!sessionId || !raw) {
      return { ok: false, errorKey: "attendance.errors.invalidForm" };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, errorKey: "attendance.errors.invalidForm" };
    }

    if (!Array.isArray(parsed)) {
      return { ok: false, errorKey: "attendance.errors.invalidForm" };
    }

    const records: AttendanceRecordInput[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const profileId = String(r.profileId ?? "").trim();
      const status = String(r.status ?? "").trim();
      if (!profileId || !isAttendanceStatus(status)) continue;
      records.push({
        profileId,
        status: status as AttendanceStatus,
        notes: String(r.notes ?? "").trim(),
      });
    }

    if (records.length === 0) {
      return { ok: false, errorKey: "attendance.errors.emptyRecords" };
    }

    await setAttendanceRecords(
      supabase,
      session.churchId,
      sessionId,
      records,
    );

    revalidateAttendance(sessionId);
    return { ok: true, sessionId };
  } catch (e) {
    return {
      ok: false,
      errorKey: toErrorKey(e, "attendance.errors.saveRecordsFailed"),
    };
  }
}
