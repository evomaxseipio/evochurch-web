"use client";

import { saveMemberLaborAction } from "@/app/apps/church/(console)/members/profile/actions";
import {
  ProfileField,
  ProfileSectionCard,
} from "@/components/members/member-profile-form-ui";
import { LABOR_FORM_ID } from "@/components/members/member-profile-toolbar";
import { TagListInput } from "@/components/ui/tag-list-input";
import { Icons } from "@/components/icons";
import type { Member, ProfileEmployment } from "@/lib/members/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveMemberEmploymentAction } from "@/app/apps/church/(console)/members/profile/actions";

function laborFormKey(member: Member): string {
  return JSON.stringify({
    professions: member.professions,
    employment: member.employment,
  });
}

export function MemberLaborTab({
  member,
  onPending,
  onMemberUpdated,
  readOnly = false,
}: {
  member: Member;
  onPending: (pending: boolean) => void;
  onMemberUpdated: (member: Member) => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("members");
  const tErrors = useTranslations("errors");
  const tValidation = useTranslations("validation");
  const router = useRouter();
  const [state, formAction] = useActionState(saveMemberLaborAction, null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const primary = member.primaryEmployment;
  const history = member.employment.filter((e) => !e.isPrimary);
  const formKey = useMemo(() => laborFormKey(member), [member]);

  useActionToast(state, {
    successMessage: t("laborSaved"),
    resolveError: (errorKey) => {
      if (!errorKey) return tErrors("serverError");
      if (errorKey.startsWith("validation.")) return tValidation(errorKey.slice(11));
      if (errorKey.startsWith("errors.")) return tErrors(errorKey.slice(7));
      return tErrors("serverError");
    },
    onSuccess: (result) => {
      if (result.member) onMemberUpdated(result.member);
      router.refresh();
    },
  });

  return (
    <div className="profile-section-stack">
      <form
        id={LABOR_FORM_ID}
        key={formKey}
        action={formAction}
        className="profile-section-stack"
      >
        <FormPendingReporter onPending={onPending} />
        <input type="hidden" name="profileId" value={member.memberId} />
        {primary?.id ? (
          <input type="hidden" name="employmentId" value={primary.id} />
        ) : null}

        <fieldset
          disabled={readOnly}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          className="profile-section-stack"
        >
          <ProfileSectionCard
            eyebrow={t("professionsEyebrow")}
            title={t("professionsTitle")}
            sub={t("professionsHint")}
          >
            <div className="form-grid">
              <TagListInput
                name="professions"
                label={t("professions")}
                hint={t("professionsInputHint")}
                defaultValue={member.professions}
                disabled={readOnly}
                placeholder={t("professionsPlaceholder")}
              />
            </div>
          </ProfileSectionCard>

          <ProfileSectionCard
            eyebrow={t("employmentEyebrow")}
            title={t("primaryEmploymentTitle")}
            sub={t("employmentOptionalHint")}
          >
            <div className="form-grid">
              <ProfileField
                label={t("employerName")}
                name="employerName"
                defaultValue={primary?.employerName}
                placeholder={t("employerNamePlaceholder")}
              />
              <ProfileField
                label={t("jobTitle")}
                name="jobTitle"
                defaultValue={primary?.jobTitle}
                placeholder={t("jobTitlePlaceholder")}
              />
              <ProfileField
                label={t("employmentSector")}
                name="sector"
                defaultValue={primary?.sector}
                placeholder={t("employmentSectorPlaceholder")}
              />
              <ProfileField
                label={t("workPhone")}
                name="workPhone"
                defaultValue={primary?.workPhone}
              />
              <ProfileField
                label={t("workEmail")}
                name="workEmail"
                type="email"
                defaultValue={primary?.workEmail}
              />
              <ProfileField
                label={t("employmentStartDate")}
                name="startDate"
                type="date"
                defaultValue={primary?.startDate}
              />
              <ProfileField
                label={t("employmentNotes")}
                name="notes"
                type="textarea"
                defaultValue={primary?.notes}
                span={3}
              />
            </div>
          </ProfileSectionCard>
        </fieldset>
      </form>

      {history.length > 0 || !readOnly ? (
        <ProfileSectionCard
          eyebrow={t("employmentHistoryEyebrow")}
          title={t("employmentHistoryTitle")}
          sub={t("employmentHistoryHint")}
          action={
            <button
              type="button"
              className="btn outline sm"
              onClick={() => setHistoryOpen((v) => !v)}
            >
              {historyOpen ? t("collapseHistory") : t("expandHistory")}
              <Icons.arrowDn
                size={12}
                style={{
                  transform: historyOpen ? "rotate(180deg)" : undefined,
                }}
              />
            </button>
          }
        >
          {historyOpen ? (
            <div className="col" style={{ gap: 12 }}>
              {history.length === 0 ? (
                <div className="tiny muted">{t("employmentHistoryEmpty")}</div>
              ) : (
                history.map((item) => (
                  <EmploymentHistoryRow
                    key={item.id}
                    item={item}
                    member={member}
                    readOnly={readOnly}
                    onMemberUpdated={onMemberUpdated}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="tiny muted">
              {t("employmentHistoryCount", { count: history.length })}
            </div>
          )}
        </ProfileSectionCard>
      ) : null}
    </div>
  );
}

function EmploymentHistoryRow({
  item,
  member,
  readOnly,
  onMemberUpdated,
}: {
  item: ProfileEmployment;
  member: Member;
  readOnly: boolean;
  onMemberUpdated: (member: Member) => void;
}) {
  const t = useTranslations("members");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [state, formAction] = useActionState(saveMemberEmploymentAction, null);

  useActionToast(state, {
    successMessage: t("employmentDeleted"),
    resolveError: (errorKey) => {
      if (!errorKey) return tErrors("serverError");
      if (errorKey.startsWith("errors.")) return tErrors(errorKey.slice(7));
      return tErrors("serverError");
    },
    onSuccess: (result) => {
      if (result.member) onMemberUpdated(result.member);
      router.refresh();
    },
  });

  const label =
    [item.jobTitle, item.employerName].filter(Boolean).join(" · ") ||
    t("previousEmployment");

  return (
    <div
      className="row between"
      style={{
        gap: 12,
        padding: "10px 12px",
        border: "1px solid var(--line)",
        borderRadius: 10,
        background: "var(--bg-2)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div className="tiny muted" style={{ marginTop: 2 }}>
          {[item.sector, item.startDate, item.endDate ? `→ ${item.endDate}` : ""]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      {!readOnly ? (
        <form action={formAction}>
          <input type="hidden" name="profileId" value={member.memberId} />
          <input type="hidden" name="employmentId" value={item.id} />
          <input type="hidden" name="employmentAction" value="delete" />
          <button
            type="submit"
            className="btn ghost sm"
            style={{ color: "var(--danger)" }}
          >
            <Icons.trash size={14} /> {t("deleteAction")}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function FormPendingReporter({
  onPending,
}: {
  onPending: (pending: boolean) => void;
}) {
  const { pending } = useFormStatus();
  useEffect(() => {
    onPending(pending);
  }, [pending, onPending]);
  return null;
}
