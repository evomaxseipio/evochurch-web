"use client";

import { churchPath } from "@/lib/apps/church-routes";
import {
  deleteMemberAction,
  saveMembershipAction,
  updateMemberAction,
} from "@/app/apps/church/(console)/members/actions";
import { Icons } from "@/components/icons";
import { MemberFinancesTab } from "@/components/members/member-finances-tab";
import { MemberFamilyTab } from "@/components/members/member-family-tab";
import { MemberFamilyTabSkeleton } from "@/components/members/member-family-tab-skeleton";
import { MemberLaborTab } from "@/components/members/member-labor-tab";
import {
  MembershipStatusField,
  ProfileField,
  ProfileSectionCard,
  YesNoField,
} from "@/components/members/member-profile-form-ui";
import { TagListInput } from "@/components/ui/tag-list-input";
import { BLOOD_TYPE_VALUES } from "@/lib/members/catalogs";
import { MembershipHistorySection } from "@/components/members/member-membership-history";
import {
  MEMBERSHIP_FORM_ID,
  PROFILE_FORM_ID,
} from "@/components/members/member-profile-toolbar";
import { MemberProfileToolbar } from "@/components/members/member-profile-toolbar";
import type { ProfileTabId } from "@/components/members/member-profile-toolbar";
import {
  MemberAvatar,
  RoleChip,
  StatusChip,
} from "@/components/members/member-ui";
import {
  GENDER_OPTIONS,
  ID_TYPE_OPTIONS,
  MARITAL_OPTIONS,
} from "@/lib/members/catalogs";
import { memberFullName } from "@/lib/members/parse";
import type { MemberRoleCatalog } from "@/lib/members/roles";
import type { Member, MembershipRecord, MemberFinanceData } from "@/lib/members/types";
import type { PastoralEvent } from "@/lib/members/pastoral-events";
import type { ChildListItem } from "@/lib/children/types";
import type { MemberFamilyData } from "@/lib/members/family";
import { useActionToast } from "@/hooks/use-action-toast";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

const PROFILE_TABS: {
  id: ProfileTabId;
  labelKey: string;
  icon: keyof typeof Icons;
  isDanger?: boolean;
}[] = [
  { id: "profile", labelKey: "tabProfile", icon: "users" },
  { id: "membership", labelKey: "tabMembership", icon: "cross" },
  { id: "labor", labelKey: "tabLabor", icon: "star" },
  { id: "finances", labelKey: "tabFinances", icon: "wallet" },
  { id: "family", labelKey: "tabFamily", icon: "home" },
  { id: "delete", labelKey: "deleteAccount", icon: "trash", isDanger: true },
];

const COUNTRY_OPTIONS = [
  { value: "República Dominicana", labelKey: "countryDominicanRepublic" },
  { value: "Estados Unidos", labelKey: "countryUnitedStates" },
  { value: "España", labelKey: "countrySpain" },
  { value: "Puerto Rico", labelKey: "countryPuertoRico" },
  { value: "Otro", labelKey: "countryOther" },
] as const;

export function MemberProfileView({
  member,
  roles,
  membership,
  tab,
  onTabChange,
  onMemberUpdated,
  onMembershipUpdated,
  finances = null,
  pastoralEvents = [],
  family = null,
  adultMembers = [],
  ministryChildren = [],
  canWriteMembers,
  canDeleteMembers,
  canReadMemberFinances,
  canWriteContributions,
}: {
  member: Member;
  roles: MemberRoleCatalog[];
  membership: MembershipRecord | null;
  tab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
  onMemberUpdated: (member: Member) => void;
  onMembershipUpdated: (membership: MembershipRecord | null) => void;
  finances?: MemberFinanceData | null;
  pastoralEvents?: PastoralEvent[];
  family?: MemberFamilyData | null;
  adultMembers?: Member[];
  ministryChildren?: ChildListItem[];
  canWriteMembers: boolean;
  canDeleteMembers: boolean;
  canReadMemberFinances: boolean;
  canWriteContributions: boolean;
}) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profilePending, setProfilePending] = useState(false);
  const [membershipPending, setMembershipPending] = useState(false);
  const [laborPending, setLaborPending] = useState(false);

  const active =
    PROFILE_TABS.find((t) => t.id === tab) ?? PROFILE_TABS[0];
  const ActiveIcon = Icons[active.icon];
  const sector =
    member.address.stateProvince || member.address.cityState || "—";
  const visibleTabs = PROFILE_TABS.filter((t) => {
    if (t.id === "delete") return canDeleteMembers;
    if (t.id === "finances") return canReadMemberFinances;
    return true;
  });

  return (
    <div>
      <div
        className="card"
        style={{
          padding: "16px 18px",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div className="row" style={{ gap: 14, alignItems: "center" }}>
          <MemberAvatar member={member} size="lg" square />
          <div>
            <div className="eyebrow">{t("memberProfile")}</div>
            <div
              className="display"
              style={{
                fontSize: 26,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                marginTop: 2,
              }}
            >
              {memberFullName(member)}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <StatusChip member={member} />
              <RoleChip role={member.membershipRole} />
              {member.address.cityState ? (
                <span className="chip lila">{member.address.cityState}</span>
              ) : null}
            </div>
          </div>
        </div>
        <MemberProfileToolbar
          tab={tab}
          profilePending={profilePending}
          membershipPending={membershipPending}
          laborPending={laborPending}
          canWriteMembers={canWriteMembers}
        />
      </div>

      <div className="profile-mobile-only" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn outline"
          onClick={() => setMobileNavOpen(true)}
          style={{ width: "100%" }}
        >
          <ActiveIcon size={15} /> {t(active.labelKey)}
          <span style={{ flex: 1 }} />
          <span className="tiny muted">{t("changeSection")}</span>
        </button>
      </div>

      <div className="profile-shell">
        <aside className="profile-aside">
          <div className="eyebrow" style={{ padding: "4px 6px 10px" }}>
            {t("memberAccount")}
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {visibleTabs.filter((t) => !t.isDanger).map((t) => (
              <ProfileTabBtn
                key={t.id}
                tab={t}
                active={tab === t.id}
                onClick={() => onTabChange(t.id)}
              />
            ))}
            <div
              style={{
                height: 1,
                background: "var(--line)",
                margin: "10px 6px",
              }}
            />
            {visibleTabs.filter((t) => t.isDanger).map((t) => (
              <ProfileTabBtn
                key={t.id}
                tab={t}
                active={tab === t.id}
                onClick={() => onTabChange(t.id)}
              />
            ))}
          </nav>

          <div
            style={{
              marginTop: 18,
              padding: 12,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: 10,
            }}
          >
            <div className="eyebrow" style={{ fontSize: 10 }}>
              {t("memberId")}
            </div>
            <div
              className="mono"
              style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}
            >
              #{member.memberId.slice(-5).padStart(5, "0")}
            </div>
            <div className="tiny muted" style={{ marginTop: 8 }}>
              <span className="mono">{sector}</span>
            </div>
          </div>
        </aside>

        {mobileNavOpen ? (
          <>
            <div
              className="drawer-backdrop"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="drawer" style={{ width: 280 }}>
              <div className="drawer-head">
                <div className="display" style={{ fontSize: 18, flex: 1 }}>
                  {t("memberAccount")}
                </div>
                <button
                  type="button"
                  className="btn ghost icon-only"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label={tCommon("close")}
                >
                  <Icons.x size={18} />
                </button>
              </div>
              <div className="drawer-body">
                <nav
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {visibleTabs.map((t) => (
                    <ProfileTabBtn
                      key={t.id}
                      tab={t}
                      active={tab === t.id}
                      onClick={() => {
                        onTabChange(t.id);
                        setMobileNavOpen(false);
                      }}
                    />
                  ))}
                </nav>
              </div>
            </div>
          </>
        ) : null}

        <div className="profile-main">
          {tab === "profile" ? (
            <ProfileTab
              member={member}
              onPending={setProfilePending}
              onMemberUpdated={onMemberUpdated}
              readOnly={!canWriteMembers}
            />
          ) : null}
          {tab === "membership" ? (
            <MembershipTab
              member={member}
              membership={membership}
              roles={roles}
              pastoralEvents={pastoralEvents}
              onPending={setMembershipPending}
              onMemberUpdated={onMemberUpdated}
              onMembershipUpdated={onMembershipUpdated}
              readOnly={!canWriteMembers}
            />
          ) : null}
          {tab === "labor" ? (
            <MemberLaborTab
              member={member}
              onPending={setLaborPending}
              onMemberUpdated={onMemberUpdated}
              readOnly={!canWriteMembers}
            />
          ) : null}
          {tab === "finances" ? (
            <MemberFinancesTab
              member={member}
              initialFinances={finances}
              canWriteContributions={canWriteContributions}
            />
          ) : null}
          {tab === "family" ? (
            family ? (
              <MemberFamilyTab
                member={member}
                family={family}
                adultMembers={adultMembers}
                ministryChildren={ministryChildren}
                roles={roles}
                canWrite={canWriteMembers}
              />
            ) : (
              <MemberFamilyTabSkeleton />
            )
          ) : null}
          {tab === "delete" ? <DeleteTab member={member} /> : null}
        </div>
      </div>
    </div>
  );
}

function ProfileTabBtn({
  tab,
  active,
  onClick,
}: {
  tab: (typeof PROFILE_TABS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("members");
  const Icon = Icons[tab.icon];
  const cls =
    "ptab" +
    (active ? " active" : "") +
    (tab.isDanger ? " danger" : "");

  return (
    <button type="button" className={cls} onClick={onClick}>
      <span className="pico">
        <Icon size={15} />
      </span>
      <span style={{ flex: 1 }}>{t(tab.labelKey)}</span>
    </button>
  );
}

function profileFormKey(member: Member): string {
  return JSON.stringify(member);
}

function ProfileTab({
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
  const [state, formAction] = useActionState(updateMemberAction, null);
  const formKey = useMemo(() => profileFormKey(member), [member]);

  const bloodOptions = BLOOD_TYPE_VALUES.map((value) => ({
    value,
    label: value ? (value === "Unknown" ? t("bloodTypeUnknown") : value) : t("bloodTypeUnset"),
  }));

  useActionToast(state, {
    successMessage: t("profileSaved"),
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
      id={PROFILE_FORM_ID}
      key={formKey}
      action={formAction}
      className="profile-section-stack"
    >
      <FormPendingReporter onPending={onPending} />
      <input type="hidden" name="memberId" value={member.memberId} />
      <input type="hidden" name="isActive" value={member.isActive ? "true" : "false"} />
      <input type="hidden" name="isMember" value={member.isMember ? "true" : "false"} />
      <input type="hidden" name="bio" value={member.bio} />

      <fieldset
        disabled={readOnly}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        className="profile-section-stack"
      >
      <ProfileSectionCard
        eyebrow={t("personalData")}
        title={t("personalInfo")}
        sub={t("personalDataHint")}
      >
        <div className="form-grid">
          <ProfileField
            label={t("firstName")}
            name="firstName"
            defaultValue={member.firstName}
            required
          />
          <ProfileField
            label={t("lastName")}
            name="lastName"
            defaultValue={member.lastName}
            required
          />
          <ProfileField
            label={t("nickname")}
            name="nickName"
            defaultValue={member.nickName}
          />
          <ProfileField
            label={t("birthDate")}
            name="dateOfBirth"
            type="date"
            defaultValue={member.dateOfBirth}
          />
          <ProfileField
            label={t("gender")}
            name="gender"
            type="select"
            options={GENDER_OPTIONS}
            defaultValue={member.gender || "Male"}
          />
          <ProfileField
            label={t("maritalStatus")}
            name="maritalStatus"
            type="select"
            options={MARITAL_OPTIONS}
            defaultValue={member.maritalStatus || "Single"}
          />
          <ProfileField
            label={t("nationality")}
            name="nationality"
            defaultValue={member.nationality}
          />
          <ProfileField
            label={t("idType")}
            name="idType"
            type="select"
            options={ID_TYPE_OPTIONS}
            defaultValue={member.idType || "ID Card"}
          />
          <ProfileField
            label={t("idNumber")}
            name="idNumber"
            defaultValue={member.idNumber}
          />
          <div className="profile-health-row">
            <ProfileField
              label={t("bloodType")}
              name="bloodType"
              type="select"
              options={bloodOptions}
              defaultValue={member.bloodType || ""}
              embedded
            />
            <TagListInput
              name="allergies"
              label={t("allergies")}
              defaultValue={member.allergies}
              disabled={readOnly}
              placeholder={t("allergiesPlaceholder")}
              embedded
            />
          </div>
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard eyebrow={t("addressInfo")} title={t("addressInfoDetail")}>
        <div className="form-grid">
          <ProfileField
            label={t("address")}
            name="streetAddress"
            defaultValue={member.address.streetAddress}
            placeholder="Calle Principal #12"
            span={2}
          />
          <ProfileField
            label={t("province")}
            name="stateProvince"
            defaultValue={member.address.stateProvince}
            placeholder="San Pedro de Macorís"
          />
          <ProfileField
            label={t("cityState")}
            name="cityState"
            defaultValue={member.address.cityState}
            placeholder="San Pedro de Macorís"
          />
          <ProfileField
            label={t("country")}
            name="country"
            type="select"
            options={COUNTRY_OPTIONS.map((o) => ({
              value: o.value,
              label: t(o.labelKey),
            }))}
            defaultValue={member.address.country || "República Dominicana"}
            span={2}
          />
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard
        eyebrow={t("contactInfo")}
        title={t("contactInfoDetail")}
      >
        <div className="form-grid">
          <ProfileField
            label={t("email")}
            name="email"
            type="email"
            defaultValue={member.contact.email}
          />
          <ProfileField
            label={t("phone")}
            name="phone"
            defaultValue={member.contact.phone}
          />
          <ProfileField
            label={t("alternatePhone")}
            name="mobilePhone"
            defaultValue={member.contact.mobilePhone}
          />
        </div>
      </ProfileSectionCard>
      </fieldset>
    </form>
  );
}

function membershipFormKey(
  member: Member,
  membership: MembershipRecord | null,
): string {
  return JSON.stringify({ member, membership });
}

function MembershipTab({
  member,
  membership,
  roles,
  pastoralEvents,
  onPending,
  onMemberUpdated,
  onMembershipUpdated,
  readOnly = false,
}: {
  member: Member;
  membership: MembershipRecord | null;
  roles: MemberRoleCatalog[];
  pastoralEvents: PastoralEvent[];
  onPending: (pending: boolean) => void;
  onMemberUpdated: (member: Member) => void;
  onMembershipUpdated: (membership: MembershipRecord | null) => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("members");
  const tErrors = useTranslations("errors");
  const tValidation = useTranslations("validation");
  const router = useRouter();
  const [state, formAction] = useActionState(saveMembershipAction, null);
  const m = membership;
  const formKey = useMemo(
    () => membershipFormKey(member, membership),
    [member, membership],
  );
  const roleOptions =
    roles.length > 0
      ? roles.map((r) => ({ value: r.id, label: r.roleName }))
      : member.membershipRoleId
        ? [{ value: member.membershipRoleId, label: member.membershipRole || t("regularMember") }]
        : [];

  const defaultRoleId =
    m?.membershipRoleId || member.membershipRoleId || roleOptions[0]?.value || "";

  useActionToast(state, {
    successMessage: t("membershipSaved"),
    resolveError: (errorKey) => {
      if (!errorKey) return tErrors("serverError");
      if (errorKey.startsWith("validation.")) return tValidation(errorKey.slice(11));
      if (errorKey.startsWith("errors.")) return tErrors(errorKey.slice(7));
      return tErrors("serverError");
    },
    onSuccess: (result) => {
      if (result.member) onMemberUpdated(result.member);
      if (result.membership !== undefined) onMembershipUpdated(result.membership);
      router.refresh();
    },
  });

  return (
    <form
      id={MEMBERSHIP_FORM_ID}
      key={formKey}
      action={formAction}
      className="profile-section-stack"
    >
      <FormPendingReporter onPending={onPending} />
      <input type="hidden" name="profileId" value={member.memberId} />

      <fieldset
        disabled={readOnly}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        className="profile-section-stack"
      >
      <ProfileSectionCard
        eyebrow={t("membership")}
        title={t("roleAndStatus")}
        sub={t("membershipDataHint")}
      >
        <div className="form-grid">
          <ProfileField
            label={t("baptismDate")}
            name="baptismDate"
            type="date"
            defaultValue={m?.baptismDate}
          />
          <ProfileField
            label={t("baptismChurch")}
            name="baptismChurch"
            defaultValue={m?.baptismChurch}
          />
          <ProfileField
            label={t("baptismPastor")}
            name="baptismPastor"
            defaultValue={m?.baptismPastor}
          />
          <ProfileField
            label={t("membershipRole")}
            name="membershipRoleId"
            type="select"
            options={roleOptions}
            defaultValue={defaultRoleId}
          />
          <ProfileField
            label={t("baptismCity")}
            name="baptismChurchCity"
            defaultValue={m?.baptismChurchCity}
          />
          <ProfileField
            label={t("baptismCountry")}
            name="baptismChurchCountry"
            defaultValue={m?.baptismChurchCountry}
          />
          <YesNoField
            label={t("baptizedInSpirit")}
            name="isBaptizedInSpirit"
            defaultValue={m?.isBaptizedInSpirit ?? false}
          />
          <YesNoField
            label={t("hasCredential")}
            name="hasCredential"
            defaultValue={m?.hasCredential ?? false}
          />
          <MembershipStatusField
            key={`${member.isActive}-${member.isMember}`}
            member={member}
          />
          <ProfileField
            label={t("pastoralNotes")}
            name="bio"
            type="textarea"
            defaultValue={member.bio}
            span={3}
            placeholder={t("pastoralNotesPlaceholder")}
          />
        </div>
      </ProfileSectionCard>

      <MembershipHistorySection
        membership={m}
        pastoralEvents={pastoralEvents}
        profileId={member.memberId}
        readOnly={readOnly}
      />
      </fieldset>
    </form>
  );
}

function DeleteTab({ member }: { member: Member }) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tValidation = useTranslations("validation");
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [state, formAction] = useActionState(deleteMemberAction, null);
  const target = t("deleteConfirmWord");
  const canDelete = confirm.trim().toUpperCase() === target.trim().toUpperCase();
  const name = memberFullName(member);

  useActionToast(state, {
    successMessage: t("deleteSuccess"),
    resolveError: (errorKey) => {
      if (!errorKey) return tErrors("serverError");
      if (errorKey.startsWith("validation.")) return tValidation(errorKey.slice(11));
      if (errorKey.startsWith("errors.")) return tErrors(errorKey.slice(7));
      return tErrors("serverError");
    },
    onSuccess: () => {
      router.push(churchPath("/members"));
      router.refresh();
    },
  });

  return (
    <div className="profile-section-stack">
      <ProfileSectionCard
        eyebrow={t("dangerZone")}
        title={t("deleteAccount")}
        sub={t("deleteWarning")}
      >
        <form
          action={formAction}
          className="col"
          style={{
            border: "1px solid color-mix(in oklab, var(--danger) 36%, transparent)",
            background: "color-mix(in oklab, var(--danger) 8%, transparent)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <input type="hidden" name="profileId" value={member.memberId} />

          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                flexShrink: 0,
                background: "color-mix(in oklab, var(--danger) 18%, transparent)",
                color: "var(--danger)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icons.trash size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "var(--danger)" }}>
                {t("deleteMemberTitle", { name })}
              </div>
              <div className="tiny muted" style={{ marginTop: 4, maxWidth: 540 }}>
                {t("deleteMemberBody")}
              </div>
            </div>
          </div>

          <ul
            style={{
              margin: "16px 0 0 56px",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {[
              t("deleteChecklistRemoveFromActive"),
              t("deleteChecklistRemoveFromMinistries"),
              t("deleteChecklistCancelMessages"),
              t("deleteChecklistFinanceHistory"),
            ].map((text) => (
              <li
                key={text}
                className="row"
                style={{ gap: 8, fontSize: 12.5, color: "var(--fg-dim)" }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: "var(--danger)",
                  }}
                />
                {text}
              </li>
            ))}
          </ul>

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop:
                "1px dashed color-mix(in oklab, var(--danger) 24%, transparent)",
            }}
          >
            <div className="field">
              <label style={{ color: "var(--fg-dim)" }}>
                {t("deleteConfirmLabel")}{" "}
                <span
                  className="mono"
                  style={{
                    background: "var(--bg-2)",
                    padding: "1px 6px",
                    borderRadius: 4,
                    color: "var(--danger)",
                    fontWeight: 600,
                  }}
                >
                  {target}
                </span>
              </label>
              <div
                className="input-wrap"
                style={{
                  borderColor: canDelete ? "var(--danger)" : "var(--line)",
                }}
              >
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t("deleteConfirmPlaceholder")}
                  autoCapitalize="characters"
                />
              </div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <Link href={churchPath("/members")} className="btn outline">
                {tCommon("cancel")}
              </Link>
              <button
                type="submit"
                className="btn"
                disabled={!canDelete}
                style={{
                  background: canDelete ? "var(--danger)" : "transparent",
                  borderColor: canDelete
                    ? "transparent"
                    : "color-mix(in oklab, var(--danger) 36%, transparent)",
                  color: canDelete ? "#fff" : "var(--danger)",
                  cursor: canDelete ? "pointer" : "not-allowed",
                }}
              >
                <Icons.trash size={14} /> {t("deleteMemberSubmit")}
              </button>
            </div>
          </div>
        </form>
      </ProfileSectionCard>

      <ProfileSectionCard
        eyebrow={t("archiveEyebrow")}
        title={t("archiveTitle")}
        sub={t("archiveBody")}
      >
        <div
          className="row between"
          style={{ gap: 12, flexWrap: "wrap" }}
        >
          <div style={{ maxWidth: 520 }}>
            <div className="tiny muted">
              {t("archiveHint")}
            </div>
          </div>
          <button type="button" className="btn outline" disabled>
            {t("archiveCta")}
          </button>
        </div>
      </ProfileSectionCard>
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
