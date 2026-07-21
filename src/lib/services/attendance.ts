import {
  parseAttendanceSessionDetail,
  parseAttendanceSessionsPage,
} from "@/lib/attendance/parse";
import type {
  AttendanceRecordInput,
  AttendanceSessionInput,
  AttendanceSessionsPage,
  AttendanceActivityType,
} from "@/lib/attendance/types";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchAttendanceSessions(
  supabase: SupabaseClient,
  opts: {
    churchId: number;
    activityType?: AttendanceActivityType | null;
    ministryId?: string | null;
    from?: string | null;
    to?: string | null;
    limit?: number;
    offset?: number;
  },
): Promise<AttendanceSessionsPage> {
  const { data, error } = await supabase.rpc("sp_list_attendance_sessions", {
    p_church_id: opts.churchId,
    p_activity_type: opts.activityType ?? null,
    p_ministry_id: opts.ministryId ?? null,
    p_from: opts.from ?? null,
    p_to: opts.to ?? null,
    p_limit: opts.limit ?? 50,
    p_offset: opts.offset ?? 0,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudieron cargar las sesiones de asistencia.");
  return parseAttendanceSessionsPage(data);
}

export async function fetchAttendanceSession(
  supabase: SupabaseClient,
  churchId: number,
  sessionId: string,
) {
  const { data, error } = await supabase.rpc("sp_get_attendance_session", {
    p_session_id: sessionId,
    p_church_id: churchId,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo cargar la sesión de asistencia.");
  const parsed = parseAttendanceSessionDetail(data);
  if (!parsed) throw new Error("Respuesta de sesión inválida.");
  return parsed;
}

export async function maintainAttendanceSession(
  supabase: SupabaseClient,
  churchId: number,
  input: AttendanceSessionInput,
  action: "insert" | "update" | "delete",
): Promise<string | null> {
  const { data, error } = await supabase.rpc("sp_maintain_attendance_session", {
    p_church_id: churchId,
    p_action: action,
    p_session_id: input.sessionId ?? null,
    p_session_date: action === "delete" ? null : input.sessionDate,
    p_activity_type: action === "delete" ? null : input.activityType,
    p_ministry_id: action === "delete" ? null : input.ministryId,
    p_event_id: null,
    p_title: action === "delete" ? null : input.title || null,
    p_notes: action === "delete" ? null : input.notes || null,
    p_attendance_mode: action === "delete" ? null : input.attendanceMode,
    p_aggregate_data: action === "delete" ? [] : input.aggregateData,
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudo guardar la sesión de asistencia.");
  const root = data as { sessionId?: string } | null;
  return root?.sessionId ? String(root.sessionId) : input.sessionId ?? null;
}

export async function setAttendanceRecords(
  supabase: SupabaseClient,
  churchId: number,
  sessionId: string,
  records: AttendanceRecordInput[],
): Promise<number> {
  const { data, error } = await supabase.rpc("sp_set_attendance_records", {
    p_church_id: churchId,
    p_session_id: sessionId,
    p_records: records.map((r) => ({
      profileId: r.profileId,
      status: r.status,
      notes: r.notes ?? "",
    })),
  });

  if (error) throw error;
  assertRpcSuccess(data, "No se pudieron guardar los registros de asistencia.");
  const root = data as { count?: number } | null;
  return typeof root?.count === "number" ? root.count : records.length;
}
