"use client";

import {
  saveAttendanceRecordsAction,
  type AttendanceActionResult,
} from "@/app/apps/church/(console)/attendance/actions";
import { AttendanceSessionFormDrawer } from "@/components/attendance/attendance-session-form-drawer";
import { Icons } from "@/components/icons";
import { useActionToast } from "@/hooks/use-action-toast";
import { recordFullName } from "@/lib/attendance/parse";
import {
  ATTENDANCE_STATUSES,
  type AttendanceRecord,
  type AttendanceSessionDetail,
  type AttendanceSessionListItem,
  type AttendanceStatus,
} from "@/lib/attendance/types";
import { churchPath } from "@/lib/apps/church-routes";
import { memberFullName } from "@/lib/members/parse";
import type { Member } from "@/lib/members/types";
import type { Ministry } from "@/lib/ministries/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState, startTransition } from "react";

type RowState = {
  profileId: string;
  name: string;
  status: AttendanceStatus;
  notes: string;
};

function resolveError(
  errorKey: string | undefined,
  tErrors: ReturnType<typeof useTranslations>,
  tAtt: ReturnType<typeof useTranslations>,
) {
  if (!errorKey) return tErrors("serverError");
  if (errorKey.startsWith("errors.")) return tErrors(errorKey.slice(7));
  if (errorKey.startsWith("attendance.")) return tAtt(errorKey.slice(11));
  return tErrors("serverError");
}

function buildRows(
  session: AttendanceSessionDetail,
  records: AttendanceRecord[],
  members: Member[],
): RowState[] {
  const byId = new Map(members.map((m) => [m.memberId, m]));
  const recordByProfile = new Map(records.map((r) => [r.profileId, r]));
  const rosterIds =
    session.ministryMemberIds.length > 0
      ? session.ministryMemberIds
      : records.map((r) => r.profileId);

  const seen = new Set<string>();
  const rows: RowState[] = [];

  for (const profileId of rosterIds) {
    if (seen.has(profileId)) continue;
    seen.add(profileId);
    const member = byId.get(profileId);
    const existing = recordByProfile.get(profileId);
    rows.push({
      profileId,
      name: member
        ? memberFullName(member)
        : existing
          ? recordFullName(existing)
          : profileId.slice(0, 8),
      status: existing?.status ?? "absent",
      notes: existing?.notes ?? "",
    });
  }

  for (const record of records) {
    if (seen.has(record.profileId)) continue;
    rows.push({
      profileId: record.profileId,
      name: recordFullName(record),
      status: record.status,
      notes: record.notes,
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function toListItem(session: AttendanceSessionDetail): AttendanceSessionListItem {
  return {
    id: session.id,
    churchId: session.churchId,
    sessionDate: session.sessionDate,
    activityType: session.activityType,
    ministryId: session.ministryId,
    ministryName: session.ministryName,
    eventId: session.eventId,
    title: session.title,
    notes: session.notes,
    createdByProfileId: session.createdByProfileId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    recordCount: 0,
  };
}

export function AttendanceChecklistView({
  session,
  records,
  members,
  ministries,
  canWrite,
}: {
  session: AttendanceSessionDetail;
  records: AttendanceRecord[];
  members: Member[];
  ministries: Ministry[];
  canWrite: boolean;
}) {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [rows, setRows] = useState(() => buildRows(session, records, members));
  const [editOpen, setEditOpen] = useState(false);
  const [saveState, saveAction, pending] = useActionState(
    saveAttendanceRecordsAction,
    null as AttendanceActionResult | null,
  );

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    for (const row of rows) {
      if (row.status === "present") present += 1;
      else if (row.status === "absent") absent += 1;
      else late += 1;
    }
    return { present, absent, late };
  }, [rows]);

  useActionToast(saveState, {
    successMessage: t("recordsSaved"),
    resolveError: (errorKey) => resolveError(errorKey, tErrors, t),
    onSuccess: () => router.refresh(),
  });

  function setStatus(profileId: string, status: AttendanceStatus) {
    setRows((prev) =>
      prev.map((row) => (row.profileId === profileId ? { ...row, status } : row)),
    );
  }

  function markAllPresent() {
    setRows((prev) => prev.map((row) => ({ ...row, status: "present" })));
  }

  function save() {
    if (rows.length === 0) return;
    const fd = new FormData();
    fd.set("sessionId", session.id);
    fd.set(
      "recordsJson",
      JSON.stringify(
        rows.map((row) => ({
          profileId: row.profileId,
          status: row.status,
          notes: row.notes,
        })),
      ),
    );
    startTransition(() => {
      saveAction(fd);
    });
  }

  return (
    <>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">{t("checklistEyebrow")}</div>
          <h1
            className="display"
            style={{
              fontSize: 34,
              margin: "4px 0 6px",
              letterSpacing: "-0.025em",
            }}
          >
            {session.title || t(`activityType.${session.activityType}`)}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {session.sessionDate}
            {session.ministryName ? ` · ${session.ministryName}` : ""}
            {` · ${t(`activityType.${session.activityType}`)}`}
          </p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link href={churchPath("/attendance")} className="btn outline">
            {t("backToList")}
          </Link>
          {canWrite ? (
            <>
              <button
                type="button"
                className="btn outline"
                onClick={() => setEditOpen(true)}
              >
                {t("editSession")}
              </button>
              <button
                type="button"
                className="btn outline"
                onClick={markAllPresent}
                disabled={pending || rows.length === 0}
              >
                {t("markAllPresent")}
              </button>
              <button
                type="button"
                className="btn"
                onClick={save}
                disabled={pending || rows.length === 0}
              >
                <Icons.check size={16} />{" "}
                {pending ? tCommon("saving") : t("saveRecords")}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div
        className="row"
        style={{ gap: 12, marginTop: 18, flexWrap: "wrap" }}
      >
        <div className="card flat" style={{ padding: "10px 14px" }}>
          {t("status.present")}: <strong>{counts.present}</strong>
        </div>
        <div className="card flat" style={{ padding: "10px 14px" }}>
          {t("status.late")}: <strong>{counts.late}</strong>
        </div>
        <div className="card flat" style={{ padding: "10px 14px" }}>
          {t("status.absent")}: <strong>{counts.absent}</strong>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="muted" style={{ marginTop: 24 }}>
          {t("emptyRoster")}
        </p>
      ) : (
        <div className="table-wrap" style={{ marginTop: 18 }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t("columns.member")}</th>
                <th>{t("columns.status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.profileId}>
                  <td>{row.name}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      {ATTENDANCE_STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          className="btn sm"
                          disabled={!canWrite || pending}
                          onClick={() => setStatus(row.profileId, status)}
                          style={{
                            background:
                              row.status === status
                                ? "var(--brand)"
                                : "var(--surface-2)",
                            color:
                              row.status === status
                                ? "white"
                                : "var(--ink-2)",
                          }}
                        >
                          {t(`status.${status}`)}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canWrite ? (
        <AttendanceSessionFormDrawer
          open={editOpen}
          mode="edit"
          session={toListItem(session)}
          presetActivityType={null}
          ministries={ministries}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </>
  );
}
