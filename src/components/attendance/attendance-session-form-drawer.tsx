"use client";

import {
  deleteAttendanceSessionAction,
  saveAttendanceSessionAction,
  type AttendanceActionResult,
} from "@/app/apps/church/(console)/attendance/actions";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DrawerField, DrawerSectionCard } from "@/components/ui/drawer-form";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  activityTypeRequiresMinistry,
  ATTENDANCE_ACTIVITY_TYPES,
  type AttendanceActivityType,
  type AttendanceSessionListItem,
} from "@/lib/attendance/types";
import { churchPath } from "@/lib/apps/church-routes";
import type { Ministry } from "@/lib/ministries/types";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState, startTransition } from "react";

type FormValues = {
  sessionDate: string;
  activityType: AttendanceActivityType;
  ministryId: string;
  title: string;
  notes: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function sessionToValues(
  session: AttendanceSessionListItem | null,
  preset: AttendanceActivityType | null,
): FormValues {
  if (!session) {
    return {
      sessionDate: todayIso(),
      activityType: preset ?? "house_group",
      ministryId: "",
      title: "",
      notes: "",
    };
  }
  return {
    sessionDate: session.sessionDate,
    activityType: session.activityType,
    ministryId: session.ministryId ?? "",
    title: session.title,
    notes: session.notes,
  };
}

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

export function AttendanceSessionFormDrawer({
  open,
  mode,
  session,
  presetActivityType,
  ministries,
  onClose,
}: {
  open: boolean;
  mode: "new" | "edit";
  session: AttendanceSessionListItem | null;
  presetActivityType: AttendanceActivityType | null;
  ministries: Ministry[];
  onClose: () => void;
}) {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [v, setV] = useState<FormValues>(() =>
    sessionToValues(session, presetActivityType),
  );
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [saveState, saveAction, savePending] = useActionState(
    saveAttendanceSessionAction,
    null as AttendanceActionResult | null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAttendanceSessionAction,
    null as AttendanceActionResult | null,
  );
  const pending = savePending || deletePending;

  const ministryOptions = useMemo(
    () =>
      ministries
        .filter((m) => m.isActive)
        .map((m) => ({ value: m.id, label: m.name })),
    [ministries],
  );

  const activityOptions = useMemo(
    () =>
      ATTENDANCE_ACTIVITY_TYPES.filter((type) => type !== "children").map(
        (type) => ({
          value: type,
          label: t(`activityType.${type}`),
        }),
      ),
    [t],
  );

  useEffect(() => {
    if (!open) return;
    setV(sessionToValues(mode === "edit" ? session : null, presetActivityType));
    setErrs({});
    setConfirmDelete(false);
  }, [open, mode, session, presetActivityType]);

  useActionToast(saveState, {
    successMessage: mode === "new" ? t("sessionCreated") : t("sessionUpdated"),
    resolveError: (errorKey) => resolveError(errorKey, tErrors, t),
    onSuccess: (result) => {
      onClose();
      if (mode === "new" && result.sessionId) {
        router.push(churchPath(`/attendance/${result.sessionId}`));
      } else {
        router.refresh();
      }
    },
  });

  useActionToast(deleteState, {
    successMessage: t("sessionDeleted"),
    resolveError: (errorKey) => resolveError(errorKey, tErrors, t),
    onSuccess: () => {
      onClose();
      router.push(churchPath("/attendance"));
      router.refresh();
    },
  });

  if (!open) return null;

  function submit() {
    const e: Record<string, string> = {};
    if (!v.sessionDate.trim()) e.sessionDate = t("errors.dateRequired");
    if (activityTypeRequiresMinistry(v.activityType) && !v.ministryId) {
      e.ministryId = t("errors.ministryRequired");
    }
    setErrs(e);
    if (Object.keys(e).length) return;

    const fd = new FormData();
    fd.set("mode", mode);
    if (mode === "edit" && session?.id) fd.set("sessionId", session.id);
    fd.set("sessionDate", v.sessionDate);
    fd.set("activityType", v.activityType);
    fd.set("ministryId", v.ministryId);
    fd.set("title", v.title.trim());
    fd.set("notes", v.notes.trim());

    startTransition(() => {
      saveAction(fd);
    });
  }

  function confirmDeleteSession() {
    if (!session?.id) return;
    const fd = new FormData();
    fd.set("sessionId", session.id);
    startTransition(() => {
      deleteAction(fd);
    });
  }

  return (
    <>
      <div
        className="drawer-backdrop"
        onClick={pending ? undefined : onClose}
      />
      <div className="drawer" role="dialog" aria-labelledby="attendance-session-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{t("eyebrow")}</div>
            <h2
              id="attendance-session-title"
              style={{ margin: "4px 0 0", fontSize: 18 }}
            >
              {mode === "new" ? t("newSession") : t("editSession")}
            </h2>
          </div>
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={onClose}
            disabled={pending}
            aria-label={tCommon("close")}
          >
            <Icons.x size={18} />
          </button>
        </div>

        <div className="drawer-body col gap-md">
          <DrawerSectionCard title={t("sessionDetails")}>
            <div className="grid-2" style={{ gap: 14 }}>
              <DrawerField
                label={t("fields.date")}
                type="date"
                required
                value={v.sessionDate}
                onChange={(value) =>
                  setV((s) => ({ ...s, sessionDate: value }))
                }
                error={errs.sessionDate}
              />
              <DrawerField
                label={t("fields.activityType")}
                type="select"
                required
                options={activityOptions}
                value={v.activityType}
                onChange={(value) =>
                  setV((s) => ({
                    ...s,
                    activityType: value as AttendanceActivityType,
                  }))
                }
              />
              <DrawerField
                label={t("fields.ministry")}
                type="select"
                required={activityTypeRequiresMinistry(v.activityType)}
                options={[
                  { value: "", label: tCommon("selectOption") },
                  ...ministryOptions,
                ]}
                value={v.ministryId}
                onChange={(value) =>
                  setV((s) => ({ ...s, ministryId: value }))
                }
                error={errs.ministryId}
                span={2}
              />
              <DrawerField
                label={t("fields.title")}
                value={v.title}
                onChange={(value) => setV((s) => ({ ...s, title: value }))}
                placeholder={t("fields.titlePlaceholder")}
                span={2}
              />
              <DrawerField
                label={t("fields.notes")}
                type="textarea"
                value={v.notes}
                onChange={(value) => setV((s) => ({ ...s, notes: value }))}
                span={2}
              />
            </div>
          </DrawerSectionCard>
        </div>

        <div className="drawer-foot row between" style={{ gap: 8 }}>
          <div>
            {mode === "edit" && session ? (
              <button
                type="button"
                className="btn ghost"
                style={{ color: "var(--danger)" }}
                disabled={pending}
                onClick={() => setConfirmDelete(true)}
              >
                {tCommon("delete")}
              </button>
            ) : null}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn outline"
              onClick={onClose}
              disabled={pending}
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              className="btn"
              onClick={submit}
              disabled={pending}
            >
              {pending ? tCommon("saving") : tCommon("save")}
            </button>
          </div>
        </div>
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title={t("deleteConfirmTitle")}
          message={t("deleteConfirmBody")}
          pending={deletePending}
          onClose={() => setConfirmDelete(false)}
          onConfirm={confirmDeleteSession}
        />
      ) : null}
    </>
  );
}
