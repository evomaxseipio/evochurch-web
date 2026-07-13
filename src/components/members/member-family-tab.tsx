"use client";

import {
  linkParentChildAction,
  linkSpouseAction,
  unlinkParentChildAction,
  unlinkSpouseAction,
} from "@/app/apps/church/(console)/members/profile/actions";
import type { ActionResult } from "@/app/apps/church/(console)/members/actions";
import { AddMemberModal } from "@/components/members/add-member-modal";
import { ChildFormDrawer } from "@/components/children/child-form-drawer";
import { Icons } from "@/components/icons";
import { ProfileSectionCard } from "@/components/members/member-profile-form-ui";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { useActionToast } from "@/hooks/use-action-toast";
import { computeAgeYears } from "@/lib/children/parse";
import type { ChildGuardianInput, ChildListItem } from "@/lib/children/types";
import { churchPath } from "@/lib/apps/church-routes";
import {
  FAMILY_CHILD_RELATIONSHIPS,
  familyChildFullName,
  familyChildProfileHref,
  familyRelationshipForGender,
  memberFamilyPersonName,
  memberFamilySpouseName,
  type FamilyChild,
  type FamilyParent,
  type FamilyChildRelationship,
  type MemberFamilyData,
  type MemberFamilySpouse,
} from "@/lib/members/family";
import { memberFullName } from "@/lib/members/parse";
import type { MemberRoleCatalog } from "@/lib/members/roles";
import type { Member } from "@/lib/members/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState, startTransition, type ReactNode } from "react";

type LinkOption = SearchableSelectOption & {
  gender: string;
};

function relationshipForGender(gender: string): ChildGuardianInput["relationship"] {
  if (gender === "Female") return "mother";
  if (gender === "Male") return "father";
  return "guardian";
}

function buildDefaultGuardians(
  member: Member,
  spouse: MemberFamilySpouse | null,
): ChildGuardianInput[] {
  const guardians: ChildGuardianInput[] = [
    {
      guardianProfileId: member.memberId,
      relationship: relationshipForGender(member.gender),
      isPrimary: true,
    },
  ];
  if (spouse) {
    guardians.push({
      guardianProfileId: spouse.profileId,
      relationship: relationshipForGender(spouse.gender),
      isPrimary: false,
    });
  }
  return guardians;
}

function familyChildToListItem(child: FamilyChild): ChildListItem {
  return {
    childId: child.profileId,
    firstName: child.firstName,
    lastName: child.lastName,
    dateOfBirth: child.dateOfBirth,
    allergies: child.allergies,
    emergencyContactName: child.emergencyContactName,
    emergencyContactPhone: child.emergencyContactPhone,
    notes: child.notes,
    guardians: child.guardians,
  };
}

function childMetaLine(
  child: FamilyChild,
  t: ReturnType<typeof useTranslations>,
  tMembers: ReturnType<typeof useTranslations>,
  tChildren: ReturnType<typeof useTranslations>,
): string {
  const age = computeAgeYears(child.dateOfBirth);
  const agePart =
    age != null ? tChildren("ageYears", { age }) : child.dateOfBirth || "—";
  const relPart = t(`relationship.${child.familyRelationship}`);

  if (child.isChild) {
    const allergyPart =
      child.allergies.length > 0
        ? t("allergiesLabel", { list: child.allergies.join(", ") })
        : t("noAllergies");
    return `${agePart} · ${relPart} · ${t("ministryChild")} · ${allergyPart}`;
  }

  const status = child.isMember ? tMembers("member") : tMembers("statusVisit");
  return `${agePart} · ${relPart} · ${status} · ${child.membershipRole}`;
}

export function MemberFamilyTab({
  member,
  family,
  adultMembers,
  ministryChildren,
  roles,
  canWrite,
}: {
  member: Member;
  family: MemberFamilyData;
  adultMembers: Member[];
  ministryChildren: ChildListItem[];
  roles: MemberRoleCatalog[];
  canWrite: boolean;
}) {
  const t = useTranslations("members.family");
  const tMembers = useTranslations("members");
  const tChildren = useTranslations("children");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tValidation = useTranslations("validation");
  const router = useRouter();

  const [spousePickerOpen, setSpousePickerOpen] = useState(false);
  const [selectedSpouseId, setSelectedSpouseId] = useState("");
  const [linkChildOpen, setLinkChildOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [selectedRelationship, setSelectedRelationship] = useState("child");
  const [childDrawerOpen, setChildDrawerOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editChild, setEditChild] = useState<FamilyChild | null>(null);

  const [linkSpouseState, linkSpouseActionFn, linkSpousePending] = useActionState(
    linkSpouseAction,
    null as ActionResult | null,
  );
  const [unlinkSpouseState, unlinkSpouseActionFn, unlinkSpousePending] =
    useActionState(unlinkSpouseAction, null as ActionResult | null);
  const [linkChildState, linkChildActionFn, linkChildPending] = useActionState(
    linkParentChildAction,
    null as ActionResult | null,
  );
  const [unlinkChildState, unlinkChildActionFn, unlinkChildPending] =
    useActionState(unlinkParentChildAction, null as ActionResult | null);

  const linkedChildIds = useMemo(
    () => new Set(family.children.map((c) => c.profileId)),
    [family.children],
  );

  const linkChildOptions = useMemo((): LinkOption[] => {
    const excluded = new Set([
      member.memberId,
      family.spouse?.profileId ?? "",
      ...linkedChildIds,
    ]);

    const adults = adultMembers
      .filter((m) => !excluded.has(m.memberId))
      .map((m) => ({
        value: m.memberId,
        label: memberFullName(m),
        sublabel: m.isMember
          ? `${tMembers("member")} · ${m.membershipRole || "—"}`
          : tMembers("statusVisit"),
        gender: m.gender,
      }));

    const minors = ministryChildren
      .filter((c) => !excluded.has(c.childId))
      .map((c) => ({
        value: c.childId,
        label: familyChildFullName(c),
        sublabel: t("ministryChild"),
        gender: "",
      }));

    return [...adults, ...minors].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
  }, [
    adultMembers,
    ministryChildren,
    family.spouse?.profileId,
    linkedChildIds,
    member.memberId,
    t,
    tMembers,
  ]);

  const spouseOptions = useMemo(
    (): SearchableSelectOption[] =>
      adultMembers
        .filter(
          (m) =>
            m.memberId !== member.memberId &&
            m.memberId !== family.spouse?.profileId,
        )
        .map((m) => ({
          value: m.memberId,
          label: memberFullName(m),
          sublabel: m.isMember
            ? `${tMembers("member")} · ${m.membershipRole || "—"}`
            : tMembers("statusVisit"),
        })),
    [adultMembers, member.memberId, family.spouse?.profileId, tMembers],
  );

  const defaultGuardians = useMemo(
    () => buildDefaultGuardians(member, family.spouse),
    [member, family.spouse],
  );

  const pending =
    linkSpousePending ||
    unlinkSpousePending ||
    linkChildPending ||
    unlinkChildPending;
  const isEmpty =
    !family.spouse &&
    family.children.length === 0 &&
    (family.parents?.length ?? 0) === 0;
  const parents = family.parents ?? [];

  useActionToast(linkSpouseState, {
    successMessage: t("spouseLinked"),
    resolveError: (k) => resolveError(k, tErrors, tValidation),
    onSuccess: () => {
      setSpousePickerOpen(false);
      setSelectedSpouseId("");
      router.refresh();
    },
  });

  useActionToast(unlinkSpouseState, {
    successMessage: t("spouseUnlinked"),
    resolveError: (k) => resolveError(k, tErrors, tValidation),
    onSuccess: () => {
      setSpousePickerOpen(false);
      router.refresh();
    },
  });

  useActionToast(linkChildState, {
    successMessage: t("childLinked"),
    resolveError: (k) => resolveError(k, tErrors, tValidation),
    onSuccess: () => {
      setLinkChildOpen(false);
      setSelectedChildId("");
      router.refresh();
    },
  });

  useActionToast(unlinkChildState, {
    successMessage: t("childUnlinked"),
    resolveError: (k) => resolveError(k, tErrors, tValidation),
    onSuccess: () => router.refresh(),
  });

  function openLinkChild() {
    setSelectedChildId("");
    setSelectedRelationship("child");
    setLinkChildOpen(true);
  }

  function submitLinkChild() {
    if (!selectedChildId) return;
    const fd = new FormData();
    fd.set("parentProfileId", member.memberId);
    fd.set("childProfileId", selectedChildId);
    fd.set("familyRelationship", selectedRelationship);
    startTransition(() => linkChildActionFn(fd));
  }

  function submitUnlinkChild(childId: string) {
    const fd = new FormData();
    fd.set("parentProfileId", member.memberId);
    fd.set("childProfileId", childId);
    startTransition(() => unlinkChildActionFn(fd));
  }

  function submitLinkSpouse() {
    if (!selectedSpouseId) return;
    const fd = new FormData();
    fd.set("profileId", member.memberId);
    fd.set("spouseProfileId", selectedSpouseId);
    startTransition(() => linkSpouseActionFn(fd));
  }

  function submitUnlinkSpouse() {
    const fd = new FormData();
    fd.set("profileId", member.memberId);
    startTransition(() => unlinkSpouseActionFn(fd));
  }

  function onLinkChildSelect(id: string) {
    setSelectedChildId(id);
    const option = linkChildOptions.find((o) => o.value === id);
    if (option?.gender) {
      setSelectedRelationship(familyRelationshipForGender(option.gender));
    }
  }

  const familyActions = canWrite ? (
    <div className="col" style={{ gap: 10, width: "100%" }}>
      <div className="tiny muted" style={{ fontWeight: 600 }}>
        {t("actionsLinkLabel")}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 8,
        }}
      >
        <button
          type="button"
          className="btn outline"
          onClick={() => setSpousePickerOpen(true)}
        >
          {t("linkSpouse")}
        </button>
        <button type="button" className="btn outline" onClick={openLinkChild}>
          {t("linkExistingChild")}
        </button>
      </div>
      <div className="tiny muted" style={{ fontWeight: 600, marginTop: 4 }}>
        {t("actionsCreateLabel")}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 8,
        }}
      >
        <button
          type="button"
          className="btn outline"
          onClick={() => {
            setEditChild(null);
            setChildDrawerOpen(true);
          }}
        >
          {t("registerMinor")}
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => setMemberModalOpen(true)}
        >
          <Icons.plus size={14} /> {t("registerMemberChild")}
        </button>
      </div>
    </div>
  ) : null;

  const childrenHeaderAction = canWrite ? (
    <button type="button" className="btn primary sm" onClick={openLinkChild}>
      <Icons.plus size={14} /> {t("addChild")}
    </button>
  ) : null;

  return (
    <>
      <div className="profile-section-stack">
        {isEmpty ? (
          <ProfileSectionCard
            eyebrow={t("eyebrow")}
            title={t("emptyTitle")}
            sub={t("emptyHint")}
          >
            {canWrite ? (
              familyActions
            ) : (
              <p className="muted tiny" style={{ margin: 0 }}>
                {t("emptyReadOnly")}
              </p>
            )}
          </ProfileSectionCard>
        ) : (
          <>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <Link
                href={churchPath(`/reports/families/${member.memberId}`)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--accent)",
                  textDecoration: "none",
                }}
              >
                {t("viewInReport")}
              </Link>
            </div>
            {parents.length > 0 ? (
              <ProfileSectionCard
                eyebrow={t("parentsEyebrow")}
                title={t("parentsTitle", { count: parents.length })}
                sub={t("parentsHint")}
              >
                <div style={{ display: "grid", gap: 10 }}>
                  {parents.map((parent) => (
                    <ParentRow
                      key={parent.profileId}
                      parent={parent}
                      t={t}
                      tMembers={tMembers}
                    />
                  ))}
                </div>
              </ProfileSectionCard>
            ) : null}

            <ProfileSectionCard
              eyebrow={t("unionEyebrow")}
              title={t("spouseTitle")}
              action={
                canWrite ? (
                  <button
                    type="button"
                    className="btn outline sm"
                    onClick={() => setSpousePickerOpen(true)}
                    disabled={pending}
                  >
                    {family.spouse ? t("changeSpouse") : t("linkSpouse")}
                  </button>
                ) : null
              }
            >
              {family.spouse ? (
                <PersonRow
                  initials={[family.spouse.firstName, family.spouse.lastName]}
                  name={memberFamilySpouseName(family.spouse)}
                  meta={`${
                    family.spouse.isMember
                      ? tMembers("member")
                      : tMembers("statusVisit")
                  } · ${family.spouse.membershipRole}`}
                  actions={
                    <>
                      <Link
                        href={churchPath(
                          `/members/profile?id=${family.spouse.profileId}`,
                        )}
                        className="btn outline sm"
                      >
                        {t("viewProfile")}
                      </Link>
                      {canWrite ? (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={submitUnlinkSpouse}
                          disabled={pending}
                        >
                          {t("unlinkSpouse")}
                        </button>
                      ) : null}
                    </>
                  }
                />
              ) : (
                <p className="muted tiny" style={{ margin: 0 }}>
                  {t("noSpouse")}
                </p>
              )}
            </ProfileSectionCard>

            <ProfileSectionCard
              eyebrow={t("childrenSectionEyebrow")}
              title={t("childrenTitle", { count: family.children.length })}
              sub={t("childrenHint")}
              action={childrenHeaderAction}
            >
              {family.children.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {family.children.map((child) => (
                    <PersonRow
                      key={child.profileId}
                      initials={[child.firstName, child.lastName]}
                      name={familyChildFullName(child)}
                      meta={childMetaLine(child, t, tMembers, tChildren)}
                      actions={
                        <>
                          <Link
                            href={churchPath(familyChildProfileHref(child))}
                            className="btn ghost sm"
                          >
                            {t("viewChild")}
                          </Link>
                          {canWrite && child.isChild ? (
                            <button
                              type="button"
                              className="btn outline sm"
                              onClick={() => {
                                setEditChild(child);
                                setChildDrawerOpen(true);
                              }}
                            >
                              {tCommon("edit")}
                            </button>
                          ) : null}
                          {canWrite ? (
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => submitUnlinkChild(child.profileId)}
                              disabled={pending}
                            >
                              {t("unlinkChild")}
                            </button>
                          ) : null}
                        </>
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="col" style={{ gap: 12 }}>
                  <p className="muted tiny" style={{ margin: 0 }}>
                    {t("noChildren")}
                  </p>
                  {canWrite ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        className="btn outline sm"
                        onClick={openLinkChild}
                      >
                        {t("linkExistingChild")}
                      </button>
                      <button
                        type="button"
                        className="btn outline sm"
                        onClick={() => {
                          setEditChild(null);
                          setChildDrawerOpen(true);
                        }}
                      >
                        {t("registerMinor")}
                      </button>
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => setMemberModalOpen(true)}
                      >
                        <Icons.plus size={14} /> {t("registerMemberChild")}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </ProfileSectionCard>
          </>
        )}
      </div>

      {spousePickerOpen ? (
        <PickerDrawer
          title={family.spouse ? t("changeSpouse") : t("linkSpouse")}
          eyebrow={t("unionEyebrow")}
          onClose={() => setSpousePickerOpen(false)}
          pending={pending}
          body={
            <div className="field">
              <label>{t("selectSpouse")}</label>
              <SearchableSelect
                options={spouseOptions}
                value={selectedSpouseId}
                onChange={setSelectedSpouseId}
                placeholder={t("selectSpousePlaceholder")}
                emptyMessage={t("noSearchResults")}
                disabled={pending}
              />
            </div>
          }
          footer={
            <div className="row between" style={{ width: "100%" }}>
              <button
                type="button"
                className="btn outline"
                onClick={() => setSpousePickerOpen(false)}
                disabled={pending}
              >
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={submitLinkSpouse}
                disabled={pending || !selectedSpouseId}
              >
                {pending ? tCommon("saving") : tCommon("save")}
              </button>
            </div>
          }
        />
      ) : null}

      {linkChildOpen ? (
        <PickerDrawer
          title={t("linkExistingChild")}
          eyebrow={t("childrenSectionEyebrow")}
          onClose={() => setLinkChildOpen(false)}
          pending={pending}
          body={
            <>
              <div className="field">
                <label>{t("selectChild")}</label>
                <SearchableSelect
                  options={linkChildOptions}
                  value={selectedChildId}
                  onChange={onLinkChildSelect}
                  placeholder={t("selectChildPlaceholder")}
                  emptyMessage={t("noSearchResults")}
                  disabled={pending}
                />
              </div>
              <div className="field">
                <label>{t("relationshipLabel")}</label>
                <div className="input-wrap">
                  <select
                    value={selectedRelationship}
                    onChange={(e) => setSelectedRelationship(e.target.value)}
                    disabled={pending}
                  >
                    {FAMILY_CHILD_RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {t(`relationship.${rel}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          }
          footer={
            <div className="row between" style={{ width: "100%" }}>
              <button
                type="button"
                className="btn outline"
                onClick={() => setLinkChildOpen(false)}
                disabled={pending}
              >
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={submitLinkChild}
                disabled={pending || !selectedChildId}
              >
                {pending ? tCommon("saving") : tCommon("save")}
              </button>
            </div>
          }
        />
      ) : null}

      {childDrawerOpen ? (
        <ChildFormDrawer
          open
          mode={editChild ? "edit" : "new"}
          child={editChild ? familyChildToListItem(editChild) : null}
          adultMembers={adultMembers}
          defaultGuardians={editChild ? undefined : defaultGuardians}
          defaultLastName={editChild ? undefined : member.lastName}
          onClose={() => {
            setChildDrawerOpen(false);
            setEditChild(null);
          }}
        />
      ) : null}

      {memberModalOpen ? (
        <AddMemberModal
          open
          roles={roles}
          linkParentProfileId={member.memberId}
          defaultLastName={member.lastName}
          onClose={() => setMemberModalOpen(false)}
        />
      ) : null}
    </>
  );
}

function PersonRow({
  initials,
  name,
  meta,
  actions,
}: {
  initials: string[];
  name: string;
  meta: string;
  actions: ReactNode;
}) {
  return (
    <div
      className="row between"
      style={{
        gap: 12,
        flexWrap: "wrap",
        padding: "12px 14px",
        borderRadius: 12,
        background: "var(--bg-2)",
      }}
    >
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        <span className="avatar md sq">
          {initials
            .filter(Boolean)
            .map((p) => p[0]?.toUpperCase() ?? "")
            .slice(0, 2)
            .join("") || "??"}
        </span>
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div className="tiny muted">{meta}</div>
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {actions}
      </div>
    </div>
  );
}

function ParentRow({
  parent,
  t,
  tMembers,
}: {
  parent: FamilyParent;
  t: ReturnType<typeof useTranslations>;
  tMembers: ReturnType<typeof useTranslations>;
}) {
  const status = parent.isMember ? tMembers("member") : tMembers("statusVisit");
  const role = t(`parentRole.${parent.parentRole}`);
  const inferred = parent.inferredFromSpouse ? ` · ${t("parentViaSpouse")}` : "";

  return (
    <PersonRow
      initials={[parent.firstName, parent.lastName]}
      name={memberFamilyPersonName(parent)}
      meta={`${role}${inferred} · ${status} · ${parent.membershipRole}`}
      actions={
        <Link
          href={churchPath(`/members/profile?id=${parent.profileId}`)}
          className="btn outline sm"
        >
          {t("viewProfile")}
        </Link>
      }
    />
  );
}

function PickerDrawer({
  title,
  eyebrow,
  onClose,
  pending,
  body,
  footer,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  pending: boolean;
  body: ReactNode;
  footer: ReactNode;
}) {
  const tCommon = useTranslations("common");

  return (
    <>
      <div
        className="drawer-backdrop"
        onClick={pending ? undefined : onClose}
      />
      <div className="drawer" style={{ width: 420 }} role="dialog">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="display" style={{ fontSize: 22, marginTop: 2 }}>
              {title}
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
        <div className="drawer-body col gap-md">{body}</div>
        <div className="drawer-foot">{footer}</div>
      </div>
    </>
  );
}

function resolveError(
  errorKey: string | undefined,
  tErrors: ReturnType<typeof useTranslations>,
  tValidation: ReturnType<typeof useTranslations>,
) {
  if (!errorKey) return tErrors("serverError");
  if (errorKey.startsWith("errors.")) return tErrors(errorKey.slice(7));
  if (errorKey.startsWith("validation.")) return tValidation(errorKey.slice(11));
  return tErrors("serverError");
}
