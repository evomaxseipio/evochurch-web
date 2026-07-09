"use client";

import { saveMemberProfessionsAction } from "@/app/(app)/members/profile/actions";
import { ProfileSectionCard } from "@/components/members/member-profile-form-ui";
import { PROFESSIONS_FORM_ID } from "@/components/members/member-profile-toolbar";
import { TagListInput } from "@/components/ui/tag-list-input";
import type { Member } from "@/lib/members/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo } from "react";
import { useFormStatus } from "react-dom";

function professionsFormKey(member: Member): string {
  return JSON.stringify(member.professions);
}

export function MemberProfessionsTab({
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
  const [state, formAction] = useActionState(saveMemberProfessionsAction, null);
  const formKey = useMemo(() => professionsFormKey(member), [member]);

  useActionToast(state, {
    successMessage: t("professionsSaved"),
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
      id={PROFESSIONS_FORM_ID}
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
