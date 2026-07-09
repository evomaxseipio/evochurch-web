"use client";

import { Icons } from "@/components/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";

export const PROFILE_FORM_ID = "member-profile-form";
export const MEMBERSHIP_FORM_ID = "member-membership-form";
export const HEALTH_FORM_ID = "member-health-form";
export const PROFESSIONS_FORM_ID = "member-professions-form";
export const EMPLOYMENT_FORM_ID = "member-employment-form";

export type ProfileTabId =
  | "profile"
  | "membership"
  | "health"
  | "professions"
  | "employment"
  | "finances"
  | "delete";

const TAB_FORM_IDS: Partial<Record<ProfileTabId, string>> = {
  profile: PROFILE_FORM_ID,
  membership: MEMBERSHIP_FORM_ID,
  health: HEALTH_FORM_ID,
  professions: PROFESSIONS_FORM_ID,
  employment: EMPLOYMENT_FORM_ID,
};

export function MemberProfileToolbar({
  tab,
  profilePending,
  membershipPending,
  healthPending = false,
  professionsPending = false,
  employmentPending = false,
  canWriteMembers,
}: {
  tab: ProfileTabId;
  profilePending: boolean;
  membershipPending: boolean;
  healthPending?: boolean;
  professionsPending?: boolean;
  employmentPending?: boolean;
  canWriteMembers: boolean;
}) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const pendingByTab: Partial<Record<ProfileTabId, boolean>> = {
    profile: profilePending,
    membership: membershipPending,
    health: healthPending,
    professions: professionsPending,
    employment: employmentPending,
  };
  const pending = pendingByTab[tab] ?? false;
  const formId = TAB_FORM_IDS[tab] ?? null;

  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
      <Link href="/members" className="btn outline sm">
        <span style={{ display: "inline-block", transform: "rotate(90deg)" }}>
          <Icons.arrowDn size={12} />
        </span>
        {t("backToList")}
      </Link>
      <button
        type="button"
        className="btn outline"
        onClick={() => window.print()}
      >
        <Icons.download size={14} /> {tCommon("print")}
      </button>
      {formId && canWriteMembers ? (
        <button
          type="submit"
          form={formId}
          disabled={pending}
          className="btn primary"
        >
          <Icons.check size={16} />
          {pending ? tCommon("saving") : tCommon("saveChanges")}
        </button>
      ) : formId ? (
        <span className="tiny muted">{tCommon("readOnly")}</span>
      ) : null}
    </div>
  );
}
