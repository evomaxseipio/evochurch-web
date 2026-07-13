"use client";

import {
  deleteChildAction,
  saveChildAction,
} from "@/app/apps/church/(console)/members/children/actions";
import type { ActionResult } from "@/app/apps/church/(console)/members/actions";
import { GuardianEditor } from "@/components/children/guardian-editor";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DrawerField, DrawerSectionCard } from "@/components/ui/drawer-form";
import { TagListInput } from "@/components/ui/tag-list-input";
import { useActionToast } from "@/hooks/use-action-toast";
import { childFullName } from "@/lib/children/parse";
import type { ChildGuardianInput, ChildListItem, ChildProfile } from "@/lib/children/types";
import type { Member } from "@/lib/members/types";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState, startTransition } from "react";

type FormValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  allergies: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  guardians: ChildGuardianInput[];
};

function childToValues(
  child: ChildListItem | ChildProfile | null,
  defaults?: {
    guardians?: ChildGuardianInput[];
    lastName?: string;
  },
): FormValues {
  if (!child) {
    return {
      firstName: "",
      lastName: defaults?.lastName ?? "",
      dateOfBirth: "",
      allergies: [],
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
      guardians: defaults?.guardians ?? [],
    };
  }

  return {
    firstName: child.firstName,
    lastName: child.lastName,
    dateOfBirth: child.dateOfBirth,
    allergies: child.allergies,
    emergencyContactName: child.emergencyContactName,
    emergencyContactPhone: child.emergencyContactPhone,
    notes: child.notes ?? "",
    guardians: child.guardians.map((g) => ({
      guardianProfileId: g.guardianProfileId,
      relationship: g.relationship,
      isPrimary: g.isPrimary,
    })),
  };
}

function resolveError(
  errorKey: string | undefined,
  tErrors: ReturnType<typeof useTranslations>,
  tValidation: ReturnType<typeof useTranslations>,
  tChildren: ReturnType<typeof useTranslations>,
) {
  if (!errorKey) return tErrors("serverError");
  if (errorKey.startsWith("errors.")) return tErrors(errorKey.slice(7));
  if (errorKey.startsWith("validation.")) return tValidation(errorKey.slice(11));
  if (errorKey.startsWith("children.")) return tChildren(errorKey.slice(9));
  return tErrors("serverError");
}

export function ChildFormDrawer({
  open,
  mode,
  child,
  adultMembers,
  defaultGuardians,
  defaultLastName,
  onClose,
}: {
  open: boolean;
  mode: "new" | "edit";
  child: ChildListItem | ChildProfile | null;
  adultMembers: Member[];
  defaultGuardians?: ChildGuardianInput[];
  defaultLastName?: string;
  onClose: () => void;
}) {
  const t = useTranslations("children");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tValidation = useTranslations("validation");
  const router = useRouter();

  const [v, setV] = useState<FormValues>(() =>
    childToValues(child, {
      guardians: defaultGuardians,
      lastName: defaultLastName,
    }),
  );
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [saveState, saveAction, savePending] = useActionState(
    saveChildAction,
    null as ActionResult | null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteChildAction,
    null as ActionResult | null,
  );

  const pending = savePending || deletePending;
  const fullName = childFullName(v);
  const initials = [v.firstName, v.lastName]
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || "??";

  useEffect(() => {
    if (!open) return;
    setV(
      childToValues(mode === "edit" ? child : null, {
        guardians: mode === "new" ? defaultGuardians : undefined,
        lastName: mode === "new" ? defaultLastName : undefined,
      }),
    );
    setErrs({});
    setConfirmDelete(false);
  }, [open, mode, child, defaultGuardians, defaultLastName]);

  useActionToast(saveState, {
    successMessage: mode === "new" ? t("savedCreate") : t("savedUpdate"),
    resolveError: (errorKey) =>
      resolveError(errorKey, tErrors, tValidation, t),
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });

  useActionToast(deleteState, {
    successMessage: t("savedDelete"),
    resolveError: (errorKey) =>
      resolveError(errorKey, tErrors, tValidation, t),
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });

  if (!open) return null;

  function submit() {
    const e: Record<string, string> = {};
    if (!v.firstName.trim()) e.firstName = tValidation("required");
    if (!v.lastName.trim()) e.lastName = tValidation("required");
    if (!v.dateOfBirth.trim()) e.dateOfBirth = tValidation("required");
    if (v.guardians.length === 0) e.guardians = t("errors.guardianRequired");
    setErrs(e);
    if (Object.keys(e).length) return;

    const fd = new FormData();
    fd.set("mode", mode === "edit" ? "edit" : "new");
    if (mode === "edit" && child?.childId) fd.set("childId", child.childId);
    fd.set("firstName", v.firstName.trim());
    fd.set("lastName", v.lastName.trim());
    fd.set("dateOfBirth", v.dateOfBirth);
    fd.set("allergies", JSON.stringify(v.allergies));
    fd.set("emergencyContactName", v.emergencyContactName.trim());
    fd.set("emergencyContactPhone", v.emergencyContactPhone.trim());
    fd.set("notes", v.notes.trim());
    fd.set("guardians", JSON.stringify(v.guardians));

    startTransition(() => {
      saveAction(fd);
    });
  }

  function confirmDeleteChild() {
    if (!child?.childId) return;
    const fd = new FormData();
    fd.set("childId", child.childId);
    startTransition(() => {
      deleteAction(fd);
    });
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={pending ? undefined : onClose} />
      <div className="drawer" role="dialog" aria-labelledby="child-form-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{t("eyebrow")}</div>
            <h2 id="child-form-title" className="display" style={{ fontSize: 24, marginTop: 2 }}>
              {mode === "new" ? t("addChild") : t("editChild")}
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
          <div
            className="row"
            style={{
              gap: 14,
              alignItems: "center",
              padding: 16,
              background: "var(--primary-50)",
              borderRadius: 14,
            }}
          >
            <span className="avatar lg sq">{initials}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{fullName || t("newChildName")}</div>
              <div className="tiny muted">{t("ageScopeHint")}</div>
            </div>
          </div>

          <DrawerSectionCard eyebrow={t("sectionIdentity")} title={t("sectionIdentityTitle")}>
            <div className="mf-grid">
              <DrawerField
                label={t("firstName")}
                required
                value={v.firstName}
                onChange={(firstName) => setV((s) => ({ ...s, firstName }))}
                error={errs.firstName}
              />
              <DrawerField
                label={t("lastName")}
                required
                value={v.lastName}
                onChange={(lastName) => setV((s) => ({ ...s, lastName }))}
                error={errs.lastName}
              />
              <DrawerField
                label={t("dateOfBirth")}
                type="date"
                required
                value={v.dateOfBirth}
                onChange={(dateOfBirth) => setV((s) => ({ ...s, dateOfBirth }))}
                error={errs.dateOfBirth}
              />
            </div>
          </DrawerSectionCard>

          <DrawerSectionCard eyebrow={t("sectionHealth")} title={t("allergies")}>
            <TagListInput
              name="childAllergies"
              value={v.allergies}
              onChange={(allergies) => setV((s) => ({ ...s, allergies }))}
              placeholder={t("allergiesPlaceholder")}
              embedded
            />
          </DrawerSectionCard>

          <DrawerSectionCard eyebrow={t("sectionEmergency")} title={t("emergencyContactName")}>
            <div className="mf-grid">
              <DrawerField
                label={t("emergencyContactName")}
                value={v.emergencyContactName}
                onChange={(emergencyContactName) =>
                  setV((s) => ({ ...s, emergencyContactName }))
                }
              />
              <DrawerField
                label={t("emergencyContactPhone")}
                type="tel"
                value={v.emergencyContactPhone}
                onChange={(emergencyContactPhone) =>
                  setV((s) => ({ ...s, emergencyContactPhone }))
                }
              />
            </div>
          </DrawerSectionCard>

          <DrawerSectionCard
            eyebrow={t("sectionGuardians")}
            title={t("guardiansLabel")}
            sub={t("guardiansHint")}
          >
            <GuardianEditor
              guardians={v.guardians}
              adultMembers={adultMembers}
              onChange={(guardians) => setV((s) => ({ ...s, guardians }))}
            />
            {errs.guardians ? (
              <span className="field-error" style={{ display: "block", marginTop: 8 }}>
                {errs.guardians}
              </span>
            ) : null}
          </DrawerSectionCard>

          <DrawerSectionCard eyebrow={t("sectionNotes")} title={t("notes")} sub={t("notesHint")}>
            <DrawerField
              label=""
              type="textarea"
              rows={4}
              value={v.notes}
              onChange={(notes) => setV((s) => ({ ...s, notes }))}
              placeholder={t("notesPlaceholder")}
              span={2}
            />
          </DrawerSectionCard>
        </div>

        <div className="drawer-foot row between">
          <div>
            {mode === "edit" && child ? (
              <button
                type="button"
                className="btn danger outline"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
              >
                {t("deleteChild")}
              </button>
            ) : null}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn outline" onClick={onClose} disabled={pending}>
              {tCommon("cancel")}
            </button>
            <button type="button" className="btn primary" onClick={submit} disabled={pending}>
              {pending ? tCommon("saving") : tCommon("save")}
            </button>
          </div>
        </div>
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title={t("deleteConfirmTitle")}
          message={t("deleteConfirmMessage", {
            name: child ? childFullName(child) : "",
          })}
          itemName={child ? childFullName(child) : undefined}
          onConfirm={confirmDeleteChild}
          onClose={() => setConfirmDelete(false)}
          pending={deletePending}
        />
      ) : null}
    </>
  );
}
