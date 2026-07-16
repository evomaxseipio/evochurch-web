export const ATTENDANCE_ACTIVITY_TYPES = [
  "house_group",
  "bible_study",
  "children",
  "service",
] as const;

export type AttendanceActivityType = (typeof ATTENDANCE_ACTIVITY_TYPES)[number];

export const ATTENDANCE_STATUSES = ["present", "absent", "late"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Orden UI tipo semáforo: presente → tarde → ausente. */
export const ATTENDANCE_STATUS_UI_ORDER = [
  "present",
  "late",
  "absent",
] as const satisfies readonly AttendanceStatus[];

/** UI presets del hub: casa, estudio, niños (ADR-006 / un motor). */
export const ATTENDANCE_UI_PRESETS = [
  "house_group",
  "bible_study",
  "children",
] as const satisfies readonly AttendanceActivityType[];

/** Origen del roster en checklist de niños. */
export type ChildrenRosterScope = "ministry" | "church" | "empty";

export type AttendanceSessionListItem = {
  id: string;
  churchId: number;
  sessionDate: string;
  activityType: AttendanceActivityType;
  ministryId: string | null;
  ministryName: string;
  eventId: string | null;
  title: string;
  notes: string;
  createdByProfileId: string | null;
  createdAt: string;
  updatedAt: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  recordCount: number;
};

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  churchId: number;
  profileId: string;
  status: AttendanceStatus;
  notes: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceSessionDetail = {
  id: string;
  churchId: number;
  sessionDate: string;
  activityType: AttendanceActivityType;
  ministryId: string | null;
  ministryName: string;
  ministryMemberIds: string[];
  eventId: string | null;
  title: string;
  notes: string;
  createdByProfileId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceSessionInput = {
  sessionId?: string;
  sessionDate: string;
  activityType: AttendanceActivityType;
  ministryId: string | null;
  title?: string;
  notes?: string;
};

export type AttendanceRecordInput = {
  profileId: string;
  status: AttendanceStatus;
  notes?: string;
};

export type AttendanceSessionsPage = {
  sessions: AttendanceSessionListItem[];
  total: number;
  limit: number;
  offset: number;
};

export function isAttendanceActivityType(
  value: string,
): value is AttendanceActivityType {
  return (ATTENDANCE_ACTIVITY_TYPES as readonly string[]).includes(value);
}

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

export function activityTypeRequiresMinistry(
  activityType: AttendanceActivityType,
): boolean {
  return activityType !== "service";
}
