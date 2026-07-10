"use client";

import type { DiscountActionResult } from "@/app/(app)/settings/discount-templates/actions";
import {
  deleteDiscountTemplateAction,
  saveDiscountTemplateAction,
} from "@/app/(app)/settings/discount-templates/actions";
import {
  DiscountLineEditor,
  type DiscountLineEditorHandle,
} from "@/components/discounts/discount-line-editor";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CrudSwitch } from "@/components/ui/crud-switch";
import { useActionToast } from "@/hooks/use-action-toast";
import { linePercentsValidForSave } from "@/lib/discounts/parse";
import {
  DISCOUNT_BASE_KINDS,
  type DiscountBaseKind,
  type DiscountTemplate,
} from "@/lib/discounts/types";
import type { ReportCatalogEntry } from "@/lib/reports/catalog";
import type { ReportId } from "@/lib/reports/types";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  startTransition,
} from "react";

type FormState = {
  name: string;
  description: string;
  baseKind: DiscountBaseKind;
  isActive: boolean;
  lines: { label: string; percent: number }[];
  reportId: ReportId | "";
};

function primaryLinkedReportId(template: DiscountTemplate | null): ReportId | "" {
  const active = template?.reportLinks.find((l) => l.isActive);
  return (active?.reportId as ReportId) ?? "";
}

function templateToForm(template: DiscountTemplate | null): FormState {
  return {
    name: template?.name ?? "",
    description: template?.description ?? "",
    baseKind: template?.baseKind ?? "tithe",
    isActive: template?.isActive ?? true,
    lines:
      template?.lines.map((l) => ({ label: l.label, percent: l.percent })) ??
      [],
    reportId: primaryLinkedReportId(template),
  };
}

export function DiscountTemplateFormDrawer({
  mode,
  template,
  open,
  onClose,
  canWrite,
  linkableReports,
}: {
  mode: "new" | "edit";
  template: DiscountTemplate | null;
  open: boolean;
  onClose: () => void;
  canWrite: boolean;
  linkableReports: ReportCatalogEntry[];
}) {
  const t = useTranslations("discountTemplates");
  const tCommon = useTranslations("common");
  const tReports = useTranslations("reports");
  const router = useRouter();
  const lineEditorRef = useRef<DiscountLineEditorHandle>(null);
  const [form, setForm] = useState<FormState>(() => templateToForm(template));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [saveState, saveAction, savePending] = useActionState(
    saveDiscountTemplateAction,
    null as DiscountActionResult | null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteDiscountTemplateAction,
    null as DiscountActionResult | null,
  );

  useEffect(() => {
    if (!open) return;
    setForm(templateToForm(template));
    setErrs({});
  }, [open, template]);

  useActionToast(saveState, {
    successMessage: t("saved"),
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });
  useActionToast(deleteState, {
    successMessage: t("deleted"),
    onSuccess: () => {
      setDeleteOpen(false);
      onClose();
      router.refresh();
    },
  });

  if (!open) return null;

  function submit() {
    const lines = lineEditorRef.current?.flushDraft() ?? form.lines;
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = tCommon("required");
    if (!linePercentsValidForSave(lines)) {
      e.lines =
        lines.length === 0 ? t("linesRequired") : t("percentMax100");
    }
    setErrs(e);
    if (Object.keys(e).length) {
      toast.error(e.lines ?? e.name ?? t("saveValidationFailed"));
      return;
    }

    const fd = new FormData();
    if (template?.id) fd.set("templateId", template.id);
    fd.set("name", form.name.trim());
    fd.set("description", form.description.trim());
    fd.set("baseKind", form.baseKind);
    fd.set("isActive", form.isActive ? "true" : "false");
    fd.set("lines", JSON.stringify(lines));
    if (form.reportId) fd.set("reportId", form.reportId);
    startTransition(() => saveAction(fd));
  }

  const linkedReportTitle = form.reportId
    ? tReports(`catalog.${form.reportId}.title`)
    : null;

  return (
    <>
      <div
        className="drawer-backdrop"
        onClick={savePending || deletePending ? undefined : onClose}
      />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">{t("configLabel")}</div>
            <h2 className="display" style={{ fontSize: 20, margin: "4px 0 0" }}>
              {mode === "new" ? t("newTemplate") : t("editTemplate")}
            </h2>
          </div>
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={onClose}
            disabled={savePending || deletePending}
            aria-label={tCommon("close")}
          >
            <Icons.x size={18} />
          </button>
        </div>

        <div className="drawer-body col gap-md">
          <div className="field">
            <label htmlFor="discount-template-name">
              {tCommon("name")} <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <div className={`input-wrap${errs.name ? " error" : ""}`}>
              <input
                id="discount-template-name"
                value={form.name}
                disabled={!canWrite}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            {errs.name ? (
              <span className="help error">{errs.name}</span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="discount-template-description">{tCommon("description")}</label>
            <div className="input-wrap">
              <textarea
                id="discount-template-description"
                rows={2}
                value={form.description}
                disabled={!canWrite}
                onChange={(e) =>
                  setForm((s) => ({ ...s, description: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="discount-template-base-kind">{t("baseKind")}</label>
            <div className="input-wrap">
              <select
                id="discount-template-base-kind"
                value={form.baseKind}
                disabled={!canWrite}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    baseKind: e.target.value as DiscountBaseKind,
                  }))
                }
              >
                {DISCOUNT_BASE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`baseKinds.${kind}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="tiny muted" style={{ marginBottom: 6 }}>
              {t("linesTitle")}
            </div>
            <DiscountLineEditor
              ref={lineEditorRef}
              lines={form.lines}
              disabled={!canWrite}
              onChange={(lines) => setForm((s) => ({ ...s, lines }))}
            />
            {errs.lines ? (
              <span className="help error" style={{ display: "block", marginTop: 6 }}>
                {errs.lines}
              </span>
            ) : null}
            <p className="tiny muted" style={{ marginTop: 6 }}>
              {t("unallocatedHint")}
            </p>
          </div>

          <div className="field">
            <label htmlFor="discount-template-report">{t("reportLinkLabel")}</label>
            <p className="tiny muted" style={{ margin: "4px 0 8px" }}>
              {t("reportLinkHint")}
            </p>
            <div className="input-wrap">
              <select
                id="discount-template-report"
                value={form.reportId}
                disabled={!canWrite || linkableReports.length === 0}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    reportId: e.target.value as ReportId | "",
                  }))
                }
              >
                <option value="">{t("reportLinkNone")}</option>
                {linkableReports.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {tReports(`catalog.${entry.id}.title`)}
                  </option>
                ))}
              </select>
            </div>
            {linkedReportTitle ? (
              <p className="tiny" style={{ marginTop: 6, color: "var(--success)" }}>
                {t("linkedReport")}: {linkedReportTitle}
              </p>
            ) : null}
            {linkableReports.length === 0 ? (
              <p className="tiny muted" style={{ marginTop: 6 }}>
                {t("noLinkableReports")}
              </p>
            ) : null}
          </div>

          {canWrite ? (
            <div className="field">
              <div className="row between" style={{ alignItems: "center" }}>
                <div>
                  <label style={{ margin: 0 }}>{tCommon("active")}</label>
                  <p className="tiny muted" style={{ margin: "4px 0 0" }}>
                    {t("activeHint")}
                  </p>
                </div>
                <CrudSwitch
                  on={form.isActive}
                  onChange={(isActive) => setForm((s) => ({ ...s, isActive }))}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="drawer-foot row" style={{ gap: 8 }}>
          {mode === "edit" && canWrite ? (
            <button
              type="button"
              className="btn outline"
              style={{ color: "var(--danger)" }}
              onClick={() => setDeleteOpen(true)}
              disabled={savePending || deletePending}
            >
              {tCommon("delete")}
            </button>
          ) : null}
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="btn outline"
            onClick={onClose}
            disabled={savePending || deletePending}
          >
            {tCommon("cancel")}
          </button>
          {canWrite ? (
            <button
              type="button"
              className="btn primary"
              disabled={savePending}
              onClick={submit}
            >
              {savePending ? tCommon("saving") : tCommon("save")}
            </button>
          ) : null}
        </div>
      </aside>

      {deleteOpen && template ? (
        <ConfirmDialog
          title={t("deleteTitle")}
          message={t("deleteMessage", { name: template.name })}
          onConfirm={() => {
            const fd = new FormData();
            fd.set("templateId", template.id);
            startTransition(() => deleteAction(fd));
          }}
          onClose={() => setDeleteOpen(false)}
          pending={deletePending}
        />
      ) : null}
    </>
  );
}
