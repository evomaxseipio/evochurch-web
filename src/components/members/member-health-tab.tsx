"use client";

import { saveMemberHealthAction } from "@/app/(app)/members/profile/actions";
import {
  ProfileField,
  ProfileSectionCard,
} from "@/components/members/member-profile-form-ui";
import { HEALTH_FORM_ID } from "@/components/members/member-profile-toolbar";
import { TagListInput } from "@/components/ui/tag-list-input";
import { BLOOD_TYPE_VALUES } from "@/lib/members/catalogs";
import type { Member } from "@/lib/members/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo } from "react";
import { useFormStatus } from "react-dom";

function healthFormKey(member: Member): string {
  return JSON.stringify({
    bloodType: member.bloodType,
    allergies: member.allergies,
  });
}

export function MemberHealthTab({
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
  const [state, formAction] = useActionState(saveMemberHealthAction, null);
  const formKey = useMemo(() => healthFormKey(member), [member]);

  const bloodOptions = BLOOD_TYPE_VALUES.map((value) => ({
    value,
    label: value ? (value === "Unknown" ? t("bloodTypeUnknown") : value) : t("bloodTypeUnset"),
  }));

  useActionToast(state, {
    successMessage: t("healthSaved"),
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
    <form
      id={HEALTH_FORM_ID}
      key={formKey}
      action={formAction}
      className="col gap-md"
    >
      <FormPendingReporter onPending={onPending} />
      <input type="hidden" name="memberId" value={member.memberId} />

      <fieldset
        disabled={readOnly}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <ProfileSectionCard
          eyebrow={t("healthEyebrow")}
          title={t("healthTitle")}
          sub={t("healthHint")}
        >
          <div className="form-grid">
            <ProfileField
              label={t("bloodType")}
              name="bloodType"
              type="select"
              options={bloodOptions}
              defaultValue={member.bloodType || ""}
            />
            <TagListInput
              name="allergies"
              label={t("allergies")}
              hint={t("allergiesHint")}
              defaultValue={member.allergies}
              disabled={readOnly}
              placeholder={t("allergiesPlaceholder")}
            />
          </div>
        </ProfileSectionCard>
      </fieldset>
    </form>
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
