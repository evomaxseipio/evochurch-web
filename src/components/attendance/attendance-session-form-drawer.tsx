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
  type AttendanceAggregateItem,
  type AttendanceMode,
  type AttendanceSessionListItem,
} from "@/lib/attendance/types";
import { churchPath } from "@/lib/apps/church-routes";
import {
  labelForMinistryCategory,
  ministriesForAttendancePicker,
} from "@/lib/ministries/parse";
import type { Ministry } from "@/lib/ministries/types";
import { ministryCategoryCodesForActivityType } from "@/lib/ministries/types";
import type { MinistryCategoryRow } from "@/lib/ministries/category-types";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";

type FormValues = {
  sessionDate: string;
  activityType: AttendanceActivityType;
  ministryId: string;
  title: string;
  notes: string;
  attendanceMode: AttendanceMode;
  aggregateData: AttendanceAggregateItem[];
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
      attendanceMode: "individual",
      aggregateData: [],
    };
  }
  return {
    sessionDate: session.sessionDate,
    activityType: session.activityType,
    ministryId: session.ministryId ?? "",
    title: session.title,
    notes: session.notes,
    attendanceMode: session.attendanceMode,
    aggregateData: session.aggregateData.map((item) => ({ ...item })),
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
  categories = [],
  onClose,
  onCreated,
}: {
  open: boolean;
  mode: "new" | "edit";
  session: AttendanceSessionListItem | null;
  presetActivityType: AttendanceActivityType | null;
  ministries: Ministry[];
  categories?: MinistryCategoryRow[];
  onClose: () => void;
  onCreated?: (sessionId: string) => void;
}) {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [v, setV] = useState<FormValues>(() => sessionToValues(session, presetActivityType));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [modeChange, setModeChange] = useState<AttendanceMode | null>(null);

  const [saveState, saveAction, savePending] = useActionState(
    saveAttendanceSessionAction,
    null as AttendanceActionResult | null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAttendanceSessionAction,
    null as AttendanceActionResult | null,
  );
  const pending = savePending || deletePending;

  const ministryOptions = useMemo(() => {
    const preferred = ministryCategoryCodesForActivityType(v.activityType);
    const preferredSet = new Set(preferred);
    return ministriesForAttendancePicker(ministries, preferred).map((m) => ({
      value: m.id,
      label: preferredSet.has(m.category)
        ? m.name
        : `${m.name} · ${labelForMinistryCategory(m.category, categories)}`,
    }));
  }, [ministries, categories, v.activityType]);

  const activityOptions = useMemo(
    () => ATTENDANCE_ACTIVITY_TYPES.map((type) => ({
      value: type,
      label: t(`activityType.${type}`),
    })),
    [t],
  );

  const aggregateTotal = useMemo(
    () => v.aggregateData.reduce((sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0), 0),
    [v.aggregateData],
  );

  useEffect(() => {
    if (!open) return;
    setV(sessionToValues(mode === "edit" ? session : null, presetActivityType));
    setErrs({});
    setConfirmDelete(false);
    setModeChange(null);
  }, [open, mode, session, presetActivityType]);

  useActionToast(saveState, {
    successMessage: mode === "new" ? t("sessionCreated") : t("sessionUpdated"),
    resolveError: (errorKey) => resolveError(errorKey, tErrors, t),
    onSuccess: (result) => {
      if (mode === "new" && result.sessionId && onCreated) {
        onCreated(result.sessionId);
        router.refresh();
        return;
      }
      onClose();
      router.refresh();
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

  function applyMode(next: AttendanceMode) {
    setV((current) => ({
      ...current,
      attendanceMode: next,
      aggregateData: next === "aggregate" ? current.aggregateData : [],
    }));
    setErrs((current) => ({ ...current, aggregateData: "" }));
  }

  function requestModeChange(next: AttendanceMode) {
    if (next === v.attendanceMode) return;
    const hasIndividualData = v.attendanceMode === "individual" && (session?.recordCount ?? 0) > 0;
    const hasAggregateData = v.attendanceMode === "aggregate" && v.aggregateData.length > 0;
    if (mode === "edit" && (hasIndividualData || hasAggregateData)) {
      setModeChange(next);
      return;
    }
    applyMode(next);
  }

  function addAggregateRow() {
    setV((current) => ({
      ...current,
      aggregateData: [...current.aggregateData, { label: "", value: 0 }],
    }));
  }

  function updateAggregateRow(index: number, patch: Partial<AttendanceAggregateItem>) {
    setV((current) => ({
      ...current,
      aggregateData: current.aggregateData.map((item, i) => i === index ? { ...item, ...patch } : item),
    }));
  }

  function removeAggregateRow(index: number) {
    setV((current) => ({
      ...current,
      aggregateData: current.aggregateData.filter((_, i) => i !== index),
    }));
  }

  function submit() {
    const e: Record<string, string> = {};
    if (!v.sessionDate.trim()) e.sessionDate = t("errors.dateRequired");
    if (activityTypeRequiresMinistry(v.activityType) && !v.ministryId) {
      e.ministryId = t("errors.ministryRequired");
    }
    if (v.attendanceMode === "aggregate") {
      if (v.aggregateData.length === 0) e.aggregateData = t("errors.aggregateRowRequired");
      else if (v.aggregateData.some((item) => !item.label.trim() || !Number.isFinite(item.value) || item.value < 0)) {
        e.aggregateData = t("errors.aggregateInvalid");
      }
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
    fd.set("attendanceMode", v.attendanceMode);
    fd.set("aggregateData", JSON.stringify(v.aggregateData.map((item) => ({
      label: item.label.trim(),
      value: item.value,
    }))));

    startTransition(() => saveAction(fd));
  }

  function confirmDeleteSession() {
    if (!session?.id) return;
    const fd = new FormData();
    fd.set("sessionId", session.id);
    startTransition(() => deleteAction(fd));
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={pending ? undefined : onClose} />
      <div className="drawer" role="dialog" aria-labelledby="attendance-session-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{t("eyebrow")}</div>
            <h2 id="attendance-session-title" style={{ margin: "4px 0 0", fontSize: 18 }}>
              {mode === "new" ? t("newSession") : t("editSession")}
            </h2>
          </div>
          <button type="button" className="btn ghost icon-only" onClick={onClose} disabled={pending} aria-label={tCommon("close")}>
            <Icons.x size={18} />
          </button>
        </div>

        <div className="drawer-body col gap-md">
          <DrawerSectionCard title={t("sessionDetails")}>
            <div className="grid-2" style={{ gap: 14 }}>
              <DrawerField label={t("fields.date")} type="date" required value={v.sessionDate} onChange={(value) => setV((s) => ({ ...s, sessionDate: value }))} error={errs.sessionDate} />
              <DrawerField label={t("fields.activityType")} type="select" required options={activityOptions} value={v.activityType} onChange={(value) => setV((s) => ({ ...s, activityType: value as AttendanceActivityType }))} />
              <DrawerField label={t("fields.ministry")} type="select" required={activityTypeRequiresMinistry(v.activityType)} options={[{ value: "", label: tCommon("selectOption") }, ...ministryOptions]} value={v.ministryId} onChange={(value) => setV((s) => ({ ...s, ministryId: value }))} error={errs.ministryId} span={2} />
              <DrawerField label={t("fields.title")} value={v.title} onChange={(value) => setV((s) => ({ ...s, title: value }))} placeholder={t("fields.titlePlaceholder")} span={2} />
              <DrawerField label={t("fields.notes")} type="textarea" value={v.notes} onChange={(value) => setV((s) => ({ ...s, notes: value }))} span={2} />
            </div>
          </DrawerSectionCard>

          <DrawerSectionCard title={t("mode.title")}>
            <div className="row" style={{ gap: 20, flexWrap: "wrap" }}>
              {(["individual", "aggregate"] as const).map((attendanceMode) => (
                <label key={attendanceMode} className="row" style={{ gap: 8, cursor: "pointer" }}>
                  <input type="radio" name="attendance-mode" checked={v.attendanceMode === attendanceMode} onChange={() => requestModeChange(attendanceMode)} disabled={pending} />
                  <span>{t(`mode.${attendanceMode}`)}</span>
                </label>
              ))}
            </div>
          </DrawerSectionCard>

          {v.attendanceMode === "aggregate" ? (
            <DrawerSectionCard title={t("aggregate.title")}>
              <div className="row between" style={{ gap: 12, marginBottom: 12 }}>
                <p className="muted" style={{ margin: 0 }}>{t("aggregate.description")}</p>
                <button type="button" className="btn outline" onClick={addAggregateRow} disabled={pending}>
                  <Icons.plus size={16} /> {t("aggregate.addRow")}
                </button>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>{t("aggregate.concept")}</th><th>{t("aggregate.quantity")}</th><th>{tCommon("actions")}</th></tr></thead>
                  <tbody>
                    {v.aggregateData.map((item, index) => (
                      <tr key={index}>
                        <td><input className="input" value={item.label} onChange={(event) => updateAggregateRow(index, { label: event.target.value })} disabled={pending} /></td>
                        <td><input className="input" type="number" min={0} step={1} value={item.value} onChange={(event) => updateAggregateRow(index, { value: Number(event.target.value) })} disabled={pending} style={{ width: 120 }} /></td>
                        <td><button type="button" className="btn ghost icon-only" onClick={() => removeAggregateRow(index)} disabled={pending} aria-label={tCommon("delete")}><Icons.trash size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><th>{t("aggregate.total")}</th><th>{aggregateTotal}</th><th /></tr></tfoot>
                </table>
              </div>
              {errs.aggregateData ? <p style={{ color: "var(--danger)", margin: "8px 0 0", fontSize: 13 }}>{errs.aggregateData}</p> : null}
            </DrawerSectionCard>
          ) : null}
        </div>

        <div className="drawer-foot row between" style={{ gap: 8 }}>
          <div>{mode === "edit" && session ? <button type="button" className="btn ghost" style={{ color: "var(--danger)" }} disabled={pending} onClick={() => setConfirmDelete(true)}>{tCommon("delete")}</button> : null}</div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn outline" onClick={onClose} disabled={pending}>{tCommon("cancel")}</button>
            <button type="button" className="btn" onClick={submit} disabled={pending}>{pending ? tCommon("saving") : tCommon("save")}</button>
          </div>
        </div>
      </div>

      {confirmDelete ? <ConfirmDialog title={t("deleteConfirmTitle")} message={t("deleteConfirmBody")} pending={deletePending} onClose={() => setConfirmDelete(false)} onConfirm={confirmDeleteSession} /> : null}

      {modeChange ? (
        <div role="dialog" aria-labelledby="attendance-mode-change-title">
          <div className="drawer-backdrop" style={{ zIndex: 60 }} onClick={() => setModeChange(null)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 61, background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: 24, width: 460, maxWidth: "92vw", boxShadow: "var(--shadow-3)" }}>
            <h3 id="attendance-mode-change-title" style={{ margin: 0 }}>{t("mode.changeTitle")}</h3>
            <p className="muted">{v.attendanceMode === "individual" ? t("mode.individualToAggregateWarning") : t("mode.aggregateToIndividualWarning")}</p>
            <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button type="button" className="btn outline" onClick={() => setModeChange(null)}>{tCommon("cancel")}</button>
              <button type="button" className="btn danger" onClick={() => { applyMode(modeChange); setModeChange(null); }}>
                {v.attendanceMode === "individual" ? t("mode.changeDeleteRecords") : t("mode.changeDeleteData")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
