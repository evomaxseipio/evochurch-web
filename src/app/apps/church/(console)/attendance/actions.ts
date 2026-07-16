"use server";

import { churchPath } from "@/lib/apps/church-routes";
import { resolveChildrenChecklistIds } from "@/lib/attendance/children-roster";
import {
  activityTypeRequiresMinistry,
  isAttendanceActivityType,
  isAttendanceStatus,
  type AttendanceRecordInput,
  type AttendanceSessionInput,
  type AttendanceStatus,
  type ChildrenRosterScope,
} from "@/lib/attendance/types";
import { hasPermission } from "@/lib/auth/permissions";
import { getActionSessionWith } from "@/lib/auth/permissions-server";
import { childListItemAsMember } from "@/lib/children/parse";
import {
  maintainAttendanceSession,
  fetchAttendanceSession,
  setAttendanceRecords,
} from "@/lib/services/attendance";
import { fetchAllChildren } from "@/lib/services/children";
import { fetchMembersPage } from "@/lib/services/members";
import { fetchMinistries } from "@/lib/services/ministries";
import { fetchMinistryCategories } from "@/lib/services/ministry-categories";
import type { Member } from "@/lib/members/types";
import { revalidatePath } from "next/cache";

export type AttendanceActionResult =
  | { ok: true; sessionId?: string }
  | { ok: false; errorKey: string };

export type AttendanceChecklistLoadResult =
  | {
      ok: true;
      session: Awaited<
        ReturnType<typeof fetchAttendanceSession>
      >["session"];
      records: Awaited<
        ReturnType<typeof fetchAttendanceSession>
      >["records"];
      members: Member[];
      ministries: Awaited<ReturnType<typeof fetchMinistries>>;
      categories: Awaited<ReturnType<typeof fetchMinistryCategories>>;
      canWrite: boolean;
      /** Solo sesiones children: origen del roster del checklist. */
      childrenRosterScope: ChildrenRosterScope | null;
    }
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

export async function loadAttendanceChecklistAction(
  sessionId: string,
): Promise<AttendanceChecklistLoadResult> {
  try {
    const id = sessionId.trim();
    if (!id) return { ok: false, errorKey: "attendance.errors.invalidForm" };

    const { supabase, session } = await getActionSessionWith("attendance:read");
    const [detail, ministries] = await Promise.all([
      fetchAttendanceSession(supabase, session.churchId, id),
      fetchMinistries(supabase, session.churchId),
    ]);

    let categories: Awaited<ReturnType<typeof fetchMinistryCategories>> = [];
    try {
      categories = await fetchMinistryCategories(supabase, session.churchId);
    } catch {
      categories = [];
    }

    let members: Member[];
    let childrenRosterScope: ChildrenRosterScope | null = null;
    let sessionOut = detail.session;

    if (detail.session.activityType === "children") {
      // spgetprofiles excluye is_child; el roster infantil usa el registro de niños.
      const children = await fetchAllChildren(supabase, session.churchId);
      members = children.map((child) =>
        childListItemAsMember(child, session.churchId),
      );
      const resolved = resolveChildrenChecklistIds(
        detail.session.ministryMemberIds,
        members.map((m) => m.memberId),
      );
      childrenRosterScope = resolved.scope;
      sessionOut = {
        ...detail.session,
        ministryMemberIds: resolved.profileIds,
      };
    } else {
      const membersResult = await fetchMembersPage(supabase, {
        churchId: session.churchId,
        page: 1,
        pageSize: null,
        filter: "all",
      });
      members = membersResult.members;
    }

    return {
      ok: true,
      session: sessionOut,
      records: detail.records,
      members,
      ministries,
      categories,
      canWrite: hasPermission(session, "attendance:write"),
      childrenRosterScope,
    };
  } catch (e) {
    return {
      ok: false,
      errorKey: toErrorKey(e, "errors.loadFailed"),
    };
  }
}
