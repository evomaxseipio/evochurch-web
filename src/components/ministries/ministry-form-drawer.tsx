"use client";

import type { MinistryActionResult } from "@/app/apps/church/(console)/ministerios/actions";
import { MemberCombobox } from "@/components/ministries/member-combobox";
import { Icons } from "@/components/icons";
import { CrudSwitch } from "@/components/ui/crud-switch";
import { useActionToast } from "@/hooks/use-action-toast";
import type { Member } from "@/lib/members/types";
import type {
  Ministry,
  MinistryCategory,
  MinistryColor,
  MinistryFormInput,
} from "@/lib/ministries/types";
import type { MinistryCategoryRow } from "@/lib/ministries/category-types";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useActionState,
  useEffect,
  useState,
  startTransition,
} from "react";

const COLOR_OPTIONS: { value: MinistryColor; label: string; css: string }[] = [
  { value: "violet", label: "Morado", css: "var(--accent)" },
  { value: "lila", label: "Lila", css: "var(--lila)" },
  { value: "green", label: "Verde", css: "var(--success)" },
];

type FormValues = MinistryFormInput;

type FormErrors = Partial<Record<"name" | "leaderProfileIds", string>>;

function defaultCategoryCode(
  categories: MinistryCategoryRow[],
  preferred?: string | null,
): MinistryCategory {
  if (preferred && categories.some((c) => c.code === preferred)) {
    return preferred;
  }
  return categories.find((c) => c.code === "other")?.code
    ?? categories[0]?.code
    ?? "other";
}

function ministryToFormValues(
  ministry: Ministry | null,
  categories: MinistryCategoryRow[],
): FormValues {
  return {
    name: ministry?.name ?? "",
    description: ministry?.description ?? "",
    category: defaultCategoryCode(categories, ministry?.category),
    leaderProfileIds: ministry?.leaderProfileIds
      ? [...ministry.leaderProfileIds]
      : [],
    memberProfileIds: ministry?.memberProfileIds ? [...ministry.memberProfileIds] : [],
    color: ministry?.color ?? "violet",
    isActive: ministry?.isActive ?? true,
    isFeatured: ministry?.isFeatured ?? false,
  };
}

export function MinistryFormDrawer({
  mode,
  ministry,
  members,
  categories,
  open,
  onClose,
  saveAction,
}: {
  mode: "new" | "edit";
  ministry: Ministry | null;
  members: Member[];
  categories: MinistryCategoryRow[];
  open: boolean;
  onClose: () => void;
  saveAction: (
    prev: MinistryActionResult | null,
    formData: FormData,
  ) => Promise<MinistryActionResult>;
}) {
  const t = useTranslations("ministerios");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const initial: MinistryActionResult | null = null;
  const [state, formAction, pending] = useActionState(saveAction, initial);
  const [values, setValues] = useState<FormValues>(() =>
    ministryToFormValues(ministry, categories),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) return;
    setValues(ministryToFormValues(ministry, categories));
    setErrors({});
  }, [open, ministry, categories]);

  useActionToast(state, {
    successMessage: mode === "new" ? t("savedCreate") : t("savedUpdate"),
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });

  if (!open) return null;

  const categoryOptions = categories.filter((c) => c.isActive || c.code === values.category);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    const nextErrors: FormErrors = {};
    if (!values.name.trim()) nextErrors.name = tCommon("required");
    if (values.leaderProfileIds.length === 0) {
      nextErrors.leaderProfileIds = t("leaderRequired");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const fd = new FormData();
    if (ministry?.id) fd.set("id", ministry.id);
    fd.set("name", values.name.trim());
    fd.set("description", values.description.trim());
    fd.set("category", values.category);
    fd.set("leaderProfileIds", JSON.stringify(values.leaderProfileIds));
    fd.set("memberProfileIds", JSON.stringify(values.memberProfileIds));
    fd.set("color", values.color);
    fd.set("isActive", values.isActive ? "true" : "false");
    fd.set("isFeatured", values.isFeatured ? "true" : "false");
    startTransition(() => formAction(fd));
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">
              {mode === "new" ? tCommon("newRecord") : tCommon("editRecord")}
            </div>
            <h2 style={{ margin: "4px 0 0", fontSize: 18 }}>
              {mode === "new" ? t("addMinistry") : t("editMinistry")}
            </h2>
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

        <div className="drawer-body col gap-md">
          <div className="field">
            <label>
              {t("nameLabel")}{" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <div className={`input-wrap${errors.name ? " error" : ""}`}>
              <input
                value={values.name}
                placeholder={t("namePlaceholder")}
                onChange={(event) => update("name", event.target.value)}
              />
            </div>
            {errors.name ? <div className="help error">{errors.name}</div> : null}
          </div>

          <div className="field">
            <label>{t("description")}</label>
            <div
              className="input-wrap"
              style={{ alignItems: "flex-start", padding: "10px 12px" }}
            >
              <textarea
                rows={3}
                value={values.description}
                placeholder={t("descriptionPlaceholder")}
                onChange={(event) => update("description", event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>
              {t("categoryLabel")}{" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <div className="input-wrap">
              <select
                value={values.category}
                onChange={(event) =>
                  update("category", event.target.value as MinistryCategory)
                }
              >
                {categoryOptions.map((category) => (
                  <option key={category.code} value={category.code}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="help">{t("categoryHelp")}</div>
          </div>

          <div className="field">
            <label>
              {t("leaders")} <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <MemberCombobox
              selectedIds={values.leaderProfileIds}
              members={members}
              adultsOnly
              onChange={(ids) => update("leaderProfileIds", ids)}
              placeholderEmpty={t("leadersPlaceholderEmpty")}
              placeholderSelected={(count) =>
                t("leadersPlaceholderSelected", { count })
              }
            />
            {errors.leaderProfileIds ? (
              <div className="help error">{errors.leaderProfileIds}</div>
            ) : null}
          </div>

          <div className="field">
            <label>{t("ministryMembers")}</label>
            <MemberCombobox
              selectedIds={values.memberProfileIds}
              members={members}
              onChange={(ids) => update("memberProfileIds", ids)}
              placeholderEmpty={t("membersPlaceholderEmpty")}
              placeholderSelected={(count) =>
                t("membersPlaceholderSelected", { count })
              }
            />
            <div className="help">{t("membersIncludeChildrenHelp")}</div>
          </div>

          <div className="field">
            <label>Color identificador</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update("color", option.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: `2px solid ${
                      values.color === option.value
                        ? option.css
                        : "var(--hairline)"
                    }`,
                    background:
                      values.color === option.value
                        ? `color-mix(in oklab, ${option.css} 12%, transparent)`
                        : "transparent",
                    transition: "all 0.15s",
                    font: "inherit",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 999,
                      background: option.css,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            className="row between"
            style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>
                Ministerio activo
              </div>
              <div className="tiny muted">
                Si está inactivo, queda archivado sin eliminarse.
              </div>
            </div>
            <CrudSwitch
              on={values.isActive}
              onChange={(value) => update("isActive", value)}
            />
          </div>

          <div
            className="row between"
            style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Destacado</div>
              <div className="tiny muted">Aparece primero en el listado.</div>
            </div>
            <CrudSwitch
              on={values.isFeatured}
              onChange={(value) => update("isFeatured", value)}
            />
          </div>
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
            {mode === "new" ? t("createMinistry") : tCommon("saveChanges")}
          </button>
        </div>
      </div>
    </>
  );
}
