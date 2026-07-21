import {
  isAttendanceActivityType,
  isAttendanceStatus,
  isAttendanceMode,
  type AttendanceActivityType,
  type AttendanceAggregateItem,
  type AttendanceRecord,
  type AttendanceSessionDetail,
  type AttendanceSessionListItem,
  type AttendanceSessionsPage,
  type AttendanceStatus,
} from "./types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dateOnly(v: unknown): string {
  const s = str(v);
  return s.slice(0, 10);
}

function uuidOrNull(v: unknown): string | null {
  const s = str(v).trim();
  return s || null;
}


function aggregateItems(v: unknown): AttendanceAggregateItem[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((item) => {
    const row = asRecord(item);
    if (!row) return [];
    const label = str(row.label).trim();
    const value = num(row.value);
    return label && value >= 0 ? [{ label, value }] : [];
  });
}

function uuidList(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((id) => str(id).trim())
      .filter((id) => id.length > 0);
  }
  return [];
}

export function parseAttendanceSessionListItem(
  row: unknown,
): AttendanceSessionListItem | null {
  const r = asRecord(row);
  if (!r) return null;
  const id = str(r.id).trim();
  const activityRaw = str(r.activityType ?? r.activity_type).trim();
  const modeRaw = str((r.attendanceMode ?? r.attendance_mode) || "individual").trim();
  if (!id || !isAttendanceActivityType(activityRaw) || !isAttendanceMode(modeRaw)) return null;

  return {
    id,
    churchId: num(r.churchId ?? r.church_id),
    sessionDate: dateOnly(r.sessionDate ?? r.session_date),
    activityType: activityRaw,
    ministryId: uuidOrNull(r.ministryId ?? r.ministry_id),
    ministryName: str(r.ministryName ?? r.ministry_name).trim(),
    eventId: uuidOrNull(r.eventId ?? r.event_id),
    title: str(r.title).trim(),
    notes: str(r.notes).trim(),
    createdByProfileId: uuidOrNull(
      r.createdByProfileId ?? r.created_by_profile_id,
    ),
    createdAt: str(r.createdAt ?? r.created_at),
    updatedAt: str(r.updatedAt ?? r.updated_at),
    presentCount: num(r.presentCount ?? r.present_count),
    absentCount: num(r.absentCount ?? r.absent_count),
    lateCount: num(r.lateCount ?? r.late_count),
    recordCount: num(r.recordCount ?? r.record_count),
    attendanceMode: modeRaw,
    aggregateData: aggregateItems(r.aggregateData ?? r.aggregate_data),
  };
}

export function parseAttendanceSessionsPage(
  data: unknown,
): AttendanceSessionsPage {
  const root = asRecord(data);
  const rows = root?.sessions;
  const sessions = Array.isArray(rows)
    ? rows
        .map(parseAttendanceSessionListItem)
        .filter((s): s is AttendanceSessionListItem => s != null)
    : [];

  return {
    sessions,
    total: num(root?.total),
    limit: num(root?.limit) || 50,
    offset: num(root?.offset),
  };
}

export function parseAttendanceRecord(row: unknown): AttendanceRecord | null {
  const r = asRecord(row);
  if (!r) return null;
  const id = str(r.id).trim();
  const profileId = str(r.profileId ?? r.profile_id).trim();
  const statusRaw = str(r.status).trim();
  if (!id || !profileId || !isAttendanceStatus(statusRaw)) return null;

  return {
    id,
    sessionId: str(r.sessionId ?? r.session_id).trim(),
    churchId: num(r.churchId ?? r.church_id),
    profileId,
    status: statusRaw,
    notes: str(r.notes).trim(),
    firstName: str(r.firstName ?? r.first_name).trim(),
    lastName: str(r.lastName ?? r.last_name).trim(),
    createdAt: str(r.createdAt ?? r.created_at),
    updatedAt: str(r.updatedAt ?? r.updated_at),
  };
}

export function parseAttendanceSessionDetail(data: unknown): {
  session: AttendanceSessionDetail;
  records: AttendanceRecord[];
} | null {
  const root = asRecord(data);
  const s = asRecord(root?.session);
  if (!s) return null;

  const id = str(s.id).trim();
  const activityRaw = str(s.activityType ?? s.activity_type).trim();
  const modeRaw = str((s.attendanceMode ?? s.attendance_mode) || "individual").trim();
  if (!id || !isAttendanceActivityType(activityRaw) || !isAttendanceMode(modeRaw)) return null;

  const session: AttendanceSessionDetail = {
    id,
    churchId: num(s.churchId ?? s.church_id),
    sessionDate: dateOnly(s.sessionDate ?? s.session_date),
    activityType: activityRaw as AttendanceActivityType,
    ministryId: uuidOrNull(s.ministryId ?? s.ministry_id),
    ministryName: str(s.ministryName ?? s.ministry_name).trim(),
    ministryMemberIds: uuidList(
      s.ministryMemberIds ?? s.ministry_member_ids,
    ),
    eventId: uuidOrNull(s.eventId ?? s.event_id),
    title: str(s.title).trim(),
    notes: str(s.notes).trim(),
    createdByProfileId: uuidOrNull(
      s.createdByProfileId ?? s.created_by_profile_id,
    ),
    createdAt: str(s.createdAt ?? s.created_at),
    updatedAt: str(s.updatedAt ?? s.updated_at),
    attendanceMode: modeRaw,
    aggregateData: aggregateItems(s.aggregateData ?? s.aggregate_data),
  };

  const recordsRaw = root?.records;
  const records = Array.isArray(recordsRaw)
    ? recordsRaw
        .map(parseAttendanceRecord)
        .filter((r): r is AttendanceRecord => r != null)
    : [];

  return { session, records };
}

export function recordFullName(record: {
  firstName: string;
  lastName: string;
}): string {
  return `${record.firstName} ${record.lastName}`.trim();
}

export function activityTypeLabelKey(
  type: AttendanceActivityType,
): `activityType.${AttendanceActivityType}` {
  return `activityType.${type}`;
}

export function statusLabelKey(
  status: AttendanceStatus,
): `status.${AttendanceStatus}` {
  return `status.${status}`;
}
