"use client";

import type { CatalogActionResult } from "@/app/apps/church/(console)/settings/expenses/actions";
import { Icons } from "@/components/icons";
import { CrudSwitch } from "@/components/ui/crud-switch";
import { useActionToast } from "@/hooks/use-action-toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState, startTransition } from "react";

type CatalogFormValues = {
  name: string;
  description: string;
  active: boolean;
};

type CatalogRow = {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
};

function rowToFormValues(row: CatalogRow | null): CatalogFormValues {
  return {
    name: row?.name ?? "",
    description: row?.description ?? "",
    active: row?.isActive ?? true,
  };
}

export function CatalogFormDrawer({
  mode,
  row,
  open,
  onClose,
  entityLabel,
  saveAction,
  activeHint,
}: {
  mode: "new" | "edit";
  row: CatalogRow | null;
  open: boolean;
  onClose: () => void;
  entityLabel: string;
  saveAction: (
    prev: CatalogActionResult | null,
    formData: FormData,
  ) => Promise<CatalogActionResult>;
  activeHint: string;
}) {
  const tCommon = useTranslations("common");
  const tCatalogs = useTranslations("catalogs");
  const router = useRouter();
  const initial: CatalogActionResult | null = null;
  const [state, formAction, pending] = useActionState(saveAction, initial);
  const [v, setV] = useState<CatalogFormValues>(() => rowToFormValues(row));
  const [errs, setErrs] = useState<Record<string, string>>({});

  const upd = <K extends keyof CatalogFormValues>(
    k: K,
    val: CatalogFormValues[K],
  ) => setV((s) => ({ ...s, [k]: val }));

  useEffect(() => {
    if (!open) return;
    setV(rowToFormValues(row));
    setErrs({});
  }, [open, row]);

  useActionToast(state, {
    successMessage:
      mode === "new"
        ? `${entityLabel} creado correctamente.`
        : `${entityLabel} actualizado correctamente.`,
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });

  if (!open) return null;

  function submit() {
    const e: Record<string, string> = {};
    if (!v.name.trim()) e.name = tCommon("required");
    setErrs(e);
    if (Object.keys(e).length) return;

    const fd = new FormData();
    if (row?.id) fd.set("id", String(row.id));
    fd.set("name", v.name.trim());
    fd.set("description", v.description.trim());
    fd.set("isActive", v.active ? "true" : "false");
    startTransition(() => {
      formAction(fd);
    });
  }

  return (
    <>
      <div
        className="drawer-backdrop"
        onClick={pending ? undefined : onClose}
      />
      <div className="drawer" role="dialog" aria-labelledby="catalog-form-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">
              {mode === "new" ? tCommon("newRecord") : tCommon("editRecord")}
            </div>
            <h2 id="catalog-form-title" style={{ margin: "4px 0 0", fontSize: 18 }}>
              {mode === "new" ? `Nuevo ${entityLabel.toLowerCase()}` : `Editar ${entityLabel.toLowerCase()}`}
            </h2>
          </div>
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={onClose}
            disabled={pending}
            aria-label="Cerrar"
          >
            <Icons.x size={18} />
          </button>
        </div>

        <div className="drawer-body col gap-md">
          <div className="field">
            <label>{tCatalogs("form.typeNameLabel")} <span style={{ color: "var(--danger)" }}>*</span></label>
            <div className={`input-wrap${errs.name ? " error" : ""}`}>
              <input
                value={v.name}
                onChange={(e) => upd("name", e.target.value)}
                placeholder={tCatalogs("namePlaceholder")}
              />
            </div>
            {errs.name ? (
              <span className="field-error">{errs.name}</span>
            ) : null}
          </div>

          <div className="field">
            <label>{tCommon("description")}</label>
            <div className="input-wrap" style={{ alignItems: "flex-start", padding: "10px 12px" }}>
              <textarea
                rows={3}
                value={v.description}
                onChange={(e) => upd("description", e.target.value)}
                placeholder={tCatalogs("descPlaceholder")}
                style={{ resize: "vertical", minHeight: 72 }}
              />
            </div>
          </div>

          <div className="field">
            <div className="row between" style={{ alignItems: "center" }}>
              <div>
                <label style={{ margin: 0 }}>{tCommon("active")}</label>
                <p className="tiny muted" style={{ margin: "4px 0 0" }}>
                  {activeHint}
                </p>
              </div>
              <CrudSwitch on={v.active} onChange={(val) => upd("active", val)} />
            </div>
          </div>
        </div>

        <div className="drawer-foot row" style={{ gap: 10, justifyContent: "flex-end" }}>
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
    </>
  );
}
