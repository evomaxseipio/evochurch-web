"use client";

import {
  loadAttendanceChecklistAction,
  type AttendanceChecklistLoadResult,
} from "@/app/apps/church/(console)/attendance/actions";
import { AttendanceChecklistView } from "@/components/attendance/attendance-checklist-view";
import { Icons } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function AttendanceChecklistDrawer({
  open,
  sessionId,
  onClose,
}: {
  open: boolean;
  sessionId: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [load, setLoad] = useState<AttendanceChecklistLoadResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !sessionId) {
      setLoad(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoad(null);

    void loadAttendanceChecklistAction(sessionId).then((result) => {
      if (cancelled) return;
      setLoad(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  if (!open || !sessionId) return null;

  const title =
    load?.ok && load.session
      ? load.session.title || t(`activityType.${load.session.activityType}`)
      : t("openChecklist");

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <div
        className="drawer"
        role="dialog"
        aria-labelledby="attendance-checklist-title"
        style={{ width: "min(720px, 100vw)" }}
      >
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">{t("checklistEyebrow")}</div>
            <h2
              id="attendance-checklist-title"
              style={{ margin: "4px 0 0", fontSize: 18 }}
            >
              {title}
            </h2>
            {load?.ok && load.session ? (
              <p className="tiny muted" style={{ margin: "4px 0 0" }}>
                {load.session.sessionDate}
                {load.session.ministryName
                  ? ` · ${load.session.ministryName}`
                  : ""}
                {` · ${t(`activityType.${load.session.activityType}`)}`}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={onClose}
            aria-label={tCommon("close")}
          >
            <Icons.x size={18} />
          </button>
        </div>

        {loading ? (
          <div className="drawer-body">
            <p className="muted">{t("loadingChecklist")}</p>
          </div>
        ) : load == null ? null : !load.ok ? (
          <div className="drawer-body">
            <p style={{ color: "var(--danger)", margin: 0 }}>
              {load.errorKey.startsWith("errors.")
                ? tErrors(load.errorKey.slice(7))
                : tErrors("loadFailed")}
            </p>
          </div>
        ) : (
          <AttendanceChecklistView
            key={load.session.id}
            session={load.session}
            records={load.records}
            members={load.members}
            ministries={load.ministries}
            categories={load.categories}
            canWrite={load.canWrite}
            childrenRosterScope={load.childrenRosterScope}
            embedded
            onClose={onClose}
          />
        )}
      </div>
    </>
  );
}
