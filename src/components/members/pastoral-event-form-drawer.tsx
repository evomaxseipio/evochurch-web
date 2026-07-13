"use client";

import {
  deletePastoralEventAction,
  savePastoralEventAction,
} from "@/app/apps/church/(console)/members/profile/actions";
import type { ActionResult } from "@/app/apps/church/(console)/members/actions";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { YesNoField } from "@/components/ui/yes-no-field";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  PASTORAL_EVENT_TYPES,
  type PastoralEvent,
  type PastoralEventType,
} from "@/lib/members/pastoral-events";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState, startTransition } from "react";

type FormValues = {
  eventType: PastoralEventType;
  title: string;
  description: string;
  eventDate: string;
  needsFollowUp: boolean;
};

function defaultValues(): FormValues {
  return {
    eventType: "illness",
    title: "",
    description: "",
    eventDate: new Date().toISOString().slice(0, 10),
    needsFollowUp: false,
  };
}

function eventToValues(event: PastoralEvent | null): FormValues {
  if (!event) return defaultValues();
  return {
    eventType: event.eventType,
    title: event.title,
    description: event.description,
    eventDate: event.eventDate || new Date().toISOString().slice(0, 10),
    needsFollowUp: event.needsFollowUp,
  };
}

export function PastoralEventFormDrawer({
  open,
  mode,
  event,
  profileId,
  onClose,
}: {
  open: boolean;
  mode: "new" | "edit";
  event: PastoralEvent | null;
  profileId: string;
  onClose: () => void;
}) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tValidation = useTranslations("validation");
  const router = useRouter();

  const [v, setV] = useState<FormValues>(() => eventToValues(event));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [saveState, saveAction, savePending] = useActionState(
    savePastoralEventAction,
    null as ActionResult | null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deletePastoralEventAction,
    null as ActionResult | null,
  );

  const pending = savePending || deletePending;

  useEffect(() => {
    if (!open) return;
    setV(eventToValues(mode === "edit" ? event : null));
    setErrs({});
    setConfirmDelete(false);
  }, [open, mode, event]);

  useActionToast(saveState, {
    successMessage:
      mode === "new" ? t("pastoralEventCreated") : t("pastoralEventUpdated"),
    resolveError: (errorKey) => resolveError(errorKey, tErrors, tValidation),
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });

  useActionToast(deleteState, {
    successMessage: t("pastoralEventDeleted"),
    resolveError: (errorKey) => resolveError(errorKey, tErrors, tValidation),
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });

  if (!open) return null;

  function submit() {
    const e: Record<string, string> = {};
    if (!v.eventDate.trim()) e.eventDate = tValidation("invalidEventDate");
    setErrs(e);
    if (Object.keys(e).length) return;

    const fd = new FormData();
    fd.set("profileId", profileId);
    if (mode === "edit" && event?.id) fd.set("eventId", event.id);
    fd.set("eventType", v.eventType);
    fd.set("title", v.title.trim());
    fd.set("description", v.description.trim());
    fd.set("eventDate", v.eventDate);
    if (v.needsFollowUp) fd.set("needsFollowUp", "on");

    startTransition(() => {
      saveAction(fd);
    });
  }

  function confirmDeleteEvent() {
    if (!event?.id) return;
    const fd = new FormData();
    fd.set("profileId", profileId);
    fd.set("eventId", event.id);
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
      <div className="drawer" role="dialog" aria-labelledby="pastoral-event-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{t("pastoralEyebrow")}</div>
            <h2 id="pastoral-event-title" style={{ margin: "4px 0 0", fontSize: 18 }}>
              {mode === "new" ? t("pastoralAddEvent") : t("pastoralEditEvent")}
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
            <label>{t("pastoralEventDate")}</label>
            <div className={`input-wrap${errs.eventDate ? " error" : ""}`}>
              <input
                type="date"
                value={v.eventDate}
                onChange={(e) => setV((s) => ({ ...s, eventDate: e.target.value }))}
              />
            </div>
            {errs.eventDate ? (
              <span className="field-error">{errs.eventDate}</span>
            ) : null}
          </div>

          <div className="field">
            <label>{t("pastoralEventTypeLabel")}</label>
            <div className="input-wrap">
              <select
                value={v.eventType}
                onChange={(e) =>
                  setV((s) => ({
                    ...s,
                    eventType: e.target.value as PastoralEventType,
                  }))
                }
              >
                {PASTORAL_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`pastoralEventType.${type}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>{t("pastoralEventTitle")}</label>
            <div className="input-wrap">
              <input
                value={v.title}
                onChange={(e) => setV((s) => ({ ...s, title: e.target.value }))}
                placeholder={t("pastoralEventTitlePlaceholder")}
              />
            </div>
          </div>

          <div className="field">
            <label>{t("pastoralEventDescription")}</label>
            <div className="input-wrap" style={{ alignItems: "flex-start", padding: "10px 12px" }}>
              <textarea
                rows={4}
                value={v.description}
                onChange={(e) =>
                  setV((s) => ({ ...s, description: e.target.value }))
                }
                placeholder={t("pastoralEventDescriptionPlaceholder")}
                style={{ resize: "vertical", minHeight: 88 }}
              />
            </div>
          </div>

          <YesNoField
            label={t("pastoralNeedsFollowUp")}
            inline
            value={v.needsFollowUp}
            onChange={(val) => setV((s) => ({ ...s, needsFollowUp: val }))}
          />
        </div>

        <div className="drawer-foot row between" style={{ gap: 10 }}>
          {mode === "edit" && event ? (
            <button
              type="button"
              className="btn ghost"
              style={{ color: "var(--danger)" }}
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
            >
              <Icons.trash size={14} /> {tCommon("delete")}
            </button>
          ) : (
            <span />
          )}
          <div className="row" style={{ gap: 10 }}>
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
              className="btn primary"
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
          title={t("pastoralDeleteTitle")}
          message={t("pastoralDeleteBody")}
          onConfirm={confirmDeleteEvent}
          onClose={() => setConfirmDelete(false)}
          pending={deletePending}
        />
      ) : null}
    </>
  );
}

function resolveError(
  errorKey: string | undefined,
  tErrors: ReturnType<typeof useTranslations<"errors">>,
  tValidation: ReturnType<typeof useTranslations<"validation">>,
): string {
  if (!errorKey) return tErrors("serverError");
  if (errorKey.startsWith("validation.")) {
    return tValidation(errorKey.slice("validation.".length) as never);
  }
  if (errorKey.startsWith("errors.")) return tErrors(errorKey.slice(7));
  return tErrors("serverError");
}
