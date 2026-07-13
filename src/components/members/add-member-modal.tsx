"use client";

import {
  createMemberAction,
  type ActionResult,
} from "@/app/apps/church/(console)/members/actions";
import { Icons } from "@/components/icons";
import { DrawerField, DrawerSectionCard } from "@/components/ui/drawer-form";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  GENDER_OPTIONS,
  ID_TYPE_OPTIONS,
  MARITAL_OPTIONS,
  type SelectOption,
} from "@/lib/members/catalogs";
import type { MemberRoleCatalog } from "@/lib/members/roles";
import { useActionState, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const initial: ActionResult | null = null;

const NATIONALITY_OPTIONS = [
  "Dominicano/a",
  "Haitiano/a",
  "Venezolano/a",
  "Estados Unidos",
  "Colombiano/a",
  "Otro",
] as const;

const COUNTRY_OPTIONS = [
  "República Dominicana",
  "Estados Unidos",
  "España",
  "Puerto Rico",
  "Otro",
] as const;

export function AddMemberModal({
  open,
  onClose,
  roles: _roles,
  linkParentProfileId,
  defaultLastName,
}: {
  open: boolean;
  onClose: () => void;
  roles: MemberRoleCatalog[];
  linkParentProfileId?: string;
  defaultLastName?: string;
}) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createMemberAction, initial);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
      return;
    }
    if (defaultLastName) setLastName(defaultLastName);
  }, [open, defaultLastName]);

  useActionToast(state, {
    successMessage: t("memberAdded"),
    resolveError: (errorKey) => {
      if (!errorKey) return tErrors("serverError");
      if (errorKey.startsWith("validation.")) return tValidation(errorKey.slice(11));
      if (errorKey.startsWith("errors.")) return tErrors(errorKey.slice(7));
      return tErrors("serverError");
    },
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });

  if (!open) return null;

  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const initials = fullName
    ? fullName
        .split(/\s+/)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("")
    : "??";

  return (
    <>
      <div
        className="drawer-backdrop"
        onClick={pending ? undefined : onClose}
        aria-hidden
      />
      <div className="drawer" role="dialog" aria-labelledby="add-member-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{t("newMember")}</div>
            <div
              id="add-member-title"
              className="display"
              style={{ fontSize: 24, marginTop: 2 }}
            >
              {t("addMember")}
            </div>
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

        <form
          action={formAction}
          className="col"
          style={{ flex: 1, minHeight: 0 }}
          onSubmit={(e) => {
            const form = e.currentTarget;
            const phone = String(new FormData(form).get("phone") ?? "").trim();
            if (!firstName.trim() || !lastName.trim()) {
              e.preventDefault();
              toast.error(t("requiredFields"), tValidation("firstNameRequired"));
              return;
            }
            if (!phone) {
              e.preventDefault();
              toast.error(t("requiredFields"), tValidation("phoneRequired"));
            }
          }}
        >
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
                <div style={{ fontWeight: 600 }}>
                  {fullName || t("newMemberName")}
                </div>
                <div className="tiny muted">
                  {t("avatarAuto")}
                </div>
              </div>
            </div>

            <DrawerSectionCard
              eyebrow={t("personalData")}
              title={t("personalInfo")}
            >
              <div className="mf-grid">
                <DrawerField
                  label={t("firstName")}
                  name="firstName"
                  required
                  placeholder={t("firstNamePlaceholder")}
                  value={firstName}
                  onChange={setFirstName}
                />
                <DrawerField
                  label={t("lastName")}
                  name="lastName"
                  required
                  placeholder={t("lastNamePlaceholder")}
                  value={lastName}
                  onChange={setLastName}
                />
                <DrawerField
                  label={t("nickname")}
                  name="nickName"
                  placeholder={t("nicknamePlaceholder")}
                />
                <DrawerField
                  label={t("birthDateShort")}
                  name="dateOfBirth"
                  type="date"
                  placeholder="yyyy-MM-dd"
                />
                <DrawerField
                  label={t("gender")}
                  name="gender"
                  type="select"
                  options={GENDER_OPTIONS}
                  defaultValue="Male"
                />
                <DrawerField
                  label={t("maritalStatus")}
                  name="maritalStatus"
                  type="select"
                  options={MARITAL_OPTIONS}
                  defaultValue="Single"
                />
                <DrawerField
                  label={t("nationality")}
                  name="nationality"
                  type="select"
                  options={NATIONALITY_OPTIONS.map((o) => ({
                    value: o,
                    label: o,
                  }))}
                  defaultValue="Dominicano/a"
                />
                <DrawerField
                  label={t("idType")}
                  name="idType"
                  type="select"
                  options={ID_TYPE_OPTIONS}
                  defaultValue="ID Card"
                />
                <DrawerField
                  label={t("idNumber")}
                  name="idNumber"
                  placeholder="000-0000000-0"
                  span={2}
                />
              </div>
            </DrawerSectionCard>

            <DrawerSectionCard eyebrow={t("location")} title={t("addressInfo")}>
              <div className="mf-grid">
                <DrawerField
                  label={t("address")}
                  name="streetAddress"
                  placeholder="Calle Principal #12"
                  span={2}
                />
                <DrawerField
                  label={t("province")}
                  name="stateProvince"
                  placeholder="Santiago"
                  defaultValue="Santiago"
                />
                <DrawerField
                  label={t("cityState")}
                  name="cityState"
                  placeholder="Santiago"
                  defaultValue="Santiago"
                />
                <DrawerField
                  label={t("country")}
                  name="country"
                  type="select"
                  options={COUNTRY_OPTIONS.map((o) => ({ value: o, label: o }))}
                  defaultValue="República Dominicana"
                  span={2}
                />
              </div>
            </DrawerSectionCard>

            <DrawerSectionCard eyebrow={t("communication")} title={t("contactInfo")}>
              <div className="mf-grid">
                <DrawerField
                  label={t("phone")}
                  name="phone"
                  required
                  placeholder="809-000-0000"
                />
                <DrawerField
                  label={t("mobile")}
                  name="mobilePhone"
                  placeholder="829-000-0000"
                />
                <DrawerField
                  label={t("email")}
                  name="email"
                  type="email"
                  placeholder="juan@correo.com"
                  span={2}
                />
              </div>
            </DrawerSectionCard>
          </div>

          <input type="hidden" name="isActive" value="true" />
          <input type="hidden" name="isMember" value="true" />
          <input type="hidden" name="membershipRoleId" value="" />
          <input type="hidden" name="bio" value="" />
          {linkParentProfileId ? (
            <input type="hidden" name="parentProfileId" value={linkParentProfileId} />
          ) : null}

          <div className="drawer-foot">
            <button
              type="button"
              className="btn outline"
              onClick={onClose}
              disabled={pending}
            >
              {tCommon("cancel")}
            </button>
            <button type="submit" className="btn primary" disabled={pending}>
              <Icons.check size={16} />
              {pending ? tCommon("saving") : t("saveMember")}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
