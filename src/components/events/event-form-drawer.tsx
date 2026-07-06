"use client";

import type { EventActionResult } from "@/app/(app)/eventos/actions";
import { Icons } from "@/components/icons";
import { CrudSwitch } from "@/components/ui/crud-switch";
import { useActionToast } from "@/hooks/use-action-toast";
import { buildWeeklyRecurrenceRule } from "@/lib/events/parse";
import type { EventSeries, EventType } from "@/lib/events/types";
import { EVENT_TYPES } from "@/lib/events/types";
import type { Ministry } from "@/lib/ministries/types";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";

type FormValues = {
  title: string;
  description: string;
  location: string;
  eventType: EventType;
  ministryId: string;
  localStartDate: string;
  localStartTime: string;
  localEndTime: string;
  isAllDay: boolean;
  isFeatured: boolean;
  isWebsiteListed: boolean;
  isWebsitePromoted: boolean;
  isRecurring: boolean;
  recurrenceUntil: string;
};

type FormErrors = Partial<
  Record<"title" | "localStartDate" | "localStartTime" | "ministryId", string>
>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultTime(): string {
  return "20:00";
}

function seriesToForm(series: EventSeries | null): FormValues {
  return {
    title: series?.title ?? "",
    description: series?.description ?? "",
    location: series?.location ?? "",
    eventType: series?.eventType ?? "estudio",
    ministryId: series?.ministryId ?? "",
    localStartDate: series?.localStartDate ?? todayIso(),
    localStartTime: series?.localStartTime || defaultTime(),
    localEndTime: series?.localEndTime ?? "",
    isAllDay: series?.isAllDay ?? false,
    isFeatured: series?.isFeatured ?? false,
    isWebsiteListed: series?.isWebsiteListed ?? false,
    isWebsitePromoted: series?.isWebsitePromoted ?? false,
    isRecurring: series?.isRecurring ?? false,
    recurrenceUntil: series?.recurrenceUntil ?? "",
  };
}

export function EventFormDrawer({
  mode,
  series,
  ministries,
  editableMinistries,
  canFeature,
  writeOwnOnly,
  open,
  onClose,
  saveAction,
}: {
  mode: "new" | "edit";
  series: EventSeries | null;
  ministries: Ministry[];
  editableMinistries: Ministry[];
  canFeature: boolean;
  writeOwnOnly: boolean;
  open: boolean;
  onClose: () => void;
  saveAction: (
    prev: EventActionResult | null,
    formData: FormData,
  ) => Promise<EventActionResult>;
}) {
  const t = useTranslations("eventos");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const initial: EventActionResult | null = null;
  const [state, formAction, pending] = useActionState(saveAction, initial);
  const [values, setValues] = useState<FormValues>(() => seriesToForm(series));
  const [errors, setErrors] = useState<FormErrors>({});

  const ministryOptions = useMemo(() => {
    if (!writeOwnOnly) return ministries;
    return editableMinistries;
  }, [ministries, editableMinistries, writeOwnOnly]);

  const weekdayLabel = useMemo(() => {
    if (!values.localStartDate) return "";
    const rule = buildWeeklyRecurrenceRule(values.localStartDate);
    const day = rule.byWeekday[0];
    return t(`weekdays.${day}`);
  }, [values.localStartDate, t]);

  useEffect(() => {
    if (!open) return;
    setValues(seriesToForm(series));
    setErrors({});
  }, [open, series]);

  useActionToast(state, {
    successMessage: t("saveSuccess"),
    onSuccess: () => {
      onClose();
      router.refresh();
    },
    resolveError: (_key, error) => {
      if (error === "titleRequired") return t("errors.titleRequired");
      if (error === "dateRequired") return t("errors.dateRequired");
      if (error === "timeRequired") return t("errors.timeRequired");
      if (error === "ministryRequired") return t("errors.ministryRequired");
      return error ?? t("errors.titleRequired");
    },
  });

  if (!open) return null;

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    const nextErrors: FormErrors = {};
    if (!values.title.trim()) nextErrors.title = t("errors.titleRequired");
    if (!values.localStartDate) nextErrors.localStartDate = t("errors.dateRequired");
    if (!values.isAllDay && !values.localStartTime) {
      nextErrors.localStartTime = t("errors.timeRequired");
    }
    if (writeOwnOnly && !values.ministryId) {
      nextErrors.ministryId = t("errors.ministryRequired");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const fd = new FormData();
    if (series?.id) fd.set("eventId", series.id);
    fd.set("title", values.title.trim());
    fd.set("description", values.description.trim());
    fd.set("location", values.location.trim());
    fd.set("eventType", values.eventType);
    fd.set("ministryId", values.ministryId);
    fd.set("localStartDate", values.localStartDate);
    fd.set("localStartTime", values.localStartTime);
    fd.set("localEndTime", values.localEndTime);
    if (values.isAllDay) fd.set("isAllDay", "on");
    if (values.isFeatured) fd.set("isFeatured", "on");
    if (values.isWebsiteListed) fd.set("isWebsiteListed", "on");
    if (values.isWebsitePromoted) fd.set("isWebsitePromoted", "on");
    if (values.isRecurring) fd.set("isRecurring", "on");
    fd.set("recurrenceUntil", values.recurrenceUntil);
    startTransition(() => formAction(fd));
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <div className="drawer" role="dialog" aria-labelledby="event-form-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">
              {mode === "new" ? tCommon("newRecord") : tCommon("editRecord")}
            </div>
            <h2 id="event-form-title" style={{ margin: "4px 0 0", fontSize: 18 }}>
              {mode === "new" ? t("newEvent") : t("editEvent")}
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
          <div className="field">
            <label>
              {t("fields.title")}{" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <div className={`input-wrap${errors.title ? " error" : ""}`}>
              <input
                value={values.title}
                placeholder={t("fields.title")}
                onChange={(event) => update("title", event.target.value)}
              />
            </div>
            {errors.title ? <div className="help error">{errors.title}</div> : null}
          </div>

          <div className="field">
            <label>{t("fields.type")}</label>
            <div className="input-wrap">
              <select
                value={values.eventType}
                onChange={(event) =>
                  update("eventType", event.target.value as EventType)
                }
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>
                {t("fields.date")}{" "}
                <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div className={`input-wrap${errors.localStartDate ? " error" : ""}`}>
                <input
                  type="date"
                  value={values.localStartDate}
                  onChange={(event) => update("localStartDate", event.target.value)}
                />
              </div>
              {errors.localStartDate ? (
                <div className="help error">{errors.localStartDate}</div>
              ) : null}
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>
                {t("fields.startTime")}
                {!values.isAllDay ? (
                  <span style={{ color: "var(--danger)" }}> *</span>
                ) : (
                  <span className="muted tiny"> ({tCommon("optional")})</span>
                )}
              </label>
              <div className={`input-wrap${errors.localStartTime ? " error" : ""}`}>
                <input
                  type="time"
                  disabled={values.isAllDay}
                  value={values.localStartTime}
                  onChange={(event) => update("localStartTime", event.target.value)}
                />
              </div>
              {errors.localStartTime ? (
                <div className="help error">{errors.localStartTime}</div>
              ) : null}
            </div>
          </div>

          <div className="field">
            <label>
              {t("fields.endTime")}
              <span className="muted tiny"> ({tCommon("optional")})</span>
            </label>
            <div className="input-wrap">
              <input
                type="time"
                disabled={values.isAllDay}
                value={values.localEndTime}
                onChange={(event) => update("localEndTime", event.target.value)}
              />
            </div>
          </div>

          <div
            className="row between"
            style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{t("allDay")}</div>
            </div>
            <CrudSwitch
              on={values.isAllDay}
              onChange={(checked) => update("isAllDay", checked)}
            />
          </div>

          <div
            className="row between"
            style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>
                {t("fields.recurrence")}
              </div>
              {values.isRecurring && weekdayLabel ? (
                <div className="tiny muted">
                  {t("fields.weeklyHint", { weekday: weekdayLabel })}
                </div>
              ) : null}
            </div>
            <CrudSwitch
              on={values.isRecurring}
              onChange={(checked) => update("isRecurring", checked)}
            />
          </div>

          {values.isRecurring ? (
            <div className="field">
              <label>
                {t("fields.recurrenceUntil")}
                <span className="muted tiny"> ({tCommon("optional")})</span>
              </label>
              <div className="input-wrap">
                <input
                  type="date"
                  value={values.recurrenceUntil}
                  onChange={(event) => update("recurrenceUntil", event.target.value)}
                />
              </div>
            </div>
          ) : null}

          {(ministryOptions.length > 0 || writeOwnOnly) && (
            <div className="field">
              <label>
                {t("fields.ministry")}
                {writeOwnOnly ? (
                  <span style={{ color: "var(--danger)" }}> *</span>
                ) : (
                  <span className="muted tiny"> ({tCommon("optional")})</span>
                )}
              </label>
              <div className={`input-wrap${errors.ministryId ? " error" : ""}`}>
                <select
                  value={values.ministryId}
                  disabled={writeOwnOnly && ministryOptions.length === 1}
                  onChange={(event) => update("ministryId", event.target.value)}
                >
                  {!writeOwnOnly ? <option value="">—</option> : null}
                  {ministryOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.ministryId ? (
                <div className="help error">{errors.ministryId}</div>
              ) : null}
            </div>
          )}

          <div className="field">
            <label>
              {t("fields.location")}
              <span className="muted tiny"> ({tCommon("optional")})</span>
            </label>
            <div className="input-wrap">
              <input
                value={values.location}
                placeholder={t("fields.location")}
                onChange={(event) => update("location", event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>{t("fields.description")}</label>
            <div
              className="input-wrap"
              style={{ alignItems: "flex-start", padding: "10px 12px" }}
            >
              <textarea
                rows={3}
                value={values.description}
                placeholder={t("fields.description")}
                onChange={(event) => update("description", event.target.value)}
              />
            </div>
          </div>

          {canFeature ? (
            <>
              <div
                className="row between"
                style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    {t("featuredLabel")}
                  </div>
                </div>
                <CrudSwitch
                  on={values.isFeatured}
                  onChange={(checked) => update("isFeatured", checked)}
                />
              </div>
              <div
                className="row between"
                style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    {t("websiteListedLabel")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {t("websiteListedHint")}
                  </div>
                </div>
                <CrudSwitch
                  on={values.isWebsiteListed}
                  onChange={(checked) => update("isWebsiteListed", checked)}
                />
              </div>
              <div
                className="row between"
                style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    {t("websitePromotedLabel")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {t("websitePromotedHint")}
                  </div>
                </div>
                <CrudSwitch
                  on={values.isWebsitePromoted}
                  onChange={(checked) => update("isWebsitePromoted", checked)}
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="drawer-foot">
          <button type="button" className="btn outline" onClick={onClose}>
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={pending}
          >
            <Icons.check size={14} />{" "}
            {mode === "new" ? t("newEvent") : tCommon("saveChanges")}
          </button>
        </div>
      </div>
    </>
  );
}
