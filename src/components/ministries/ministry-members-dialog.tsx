"use client";

import { churchPath } from "@/lib/apps/church-routes";
import { MinistryIcon } from "@/components/ministries/ministry-ui";
import { Icons } from "@/components/icons";
import {
  memberFullName,
  memberInitials,
} from "@/lib/members/parse";
import type { Member } from "@/lib/members/types";
import {
  resolveMinistryLeaders,
  resolveMinistryMembers,
} from "@/lib/ministries/parse";
import type { Ministry } from "@/lib/ministries/types";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

function avatarGradient(initials: string): string {
  const a = initials.charCodeAt(0) ?? 0;
  const b = initials.charCodeAt(Math.min(1, initials.length - 1)) ?? 0;
  return `linear-gradient(135deg, hsl(${(a * 17) % 360} 50% 45%), hsl(${(b * 23) % 360} 60% 35%))`;
}

function matchesMemberQuery(member: Member, query: string): boolean {
  const haystack = [
    memberFullName(member),
    member.contact.email,
    member.contact.mobilePhone,
    member.contact.phone,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function MinistryPersonRow({
  member,
  isLeader,
  canViewProfiles,
  onClose,
  isLast,
}: {
  member: Member;
  isLeader: boolean;
  canViewProfiles: boolean;
  onClose: () => void;
  isLast: boolean;
}) {
  const t = useTranslations("ministerios");
  const tMembers = useTranslations("members");
  const initials = memberInitials(member);
  const profileHref = `${churchPath("/members/profile")}?id=${member.memberId}`;
  const contact = [member.contact.email, member.contact.mobilePhone]
    .filter(Boolean)
    .join(" • ");

  return (
    <li
      className="row"
      style={{
        gap: 12,
        padding: "12px 14px",
        alignItems: "center",
        borderBottom: isLast ? "none" : "1px solid var(--hairline)",
      }}
    >
      <span
        className="avatar md"
        style={{ background: avatarGradient(initials), flexShrink: 0 }}
      >
        {initials}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          className="row"
          style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
        >
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {memberFullName(member)}
          </span>
          {isLeader ? (
            <span className="chip violet" style={{ fontSize: 11 }}>
              <Icons.crown size={10} /> {t("leader")}
            </span>
          ) : null}
        </div>
        {contact ? (
          <div className="muted tiny" style={{ marginTop: 4 }}>
            {contact}
          </div>
        ) : null}
      </div>
      {canViewProfiles ? (
        <Link
          href={profileHref}
          className="btn outline sm"
          style={{ flexShrink: 0, whiteSpace: "nowrap" }}
          onClick={onClose}
        >
          {tMembers("viewProfile")} <Icons.arrowRight size={12} />
        </Link>
      ) : null}
    </li>
  );
}

function SectionHeading({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="row"
      style={{
        gap: 6,
        margin: "0 0 8px",
        alignItems: "center",
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--accent)",
      }}
    >
      {icon}
      {children}
    </div>
  );
}

function MemberList({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ul
      style={{
        listStyle: "none",
        margin: "0 0 16px",
        padding: 0,
        border: "1px solid var(--hairline)",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--surface)",
      }}
    >
      {children}
    </ul>
  );
}

export function MinistryMembersDialog({
  ministry,
  members,
  canViewProfiles,
  canAddMembers,
  onAddMember,
  open,
  onClose,
}: {
  ministry: Ministry | null;
  members: Member[];
  canViewProfiles: boolean;
  canAddMembers: boolean;
  onAddMember: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("ministerios");
  const tCommon = useTranslations("common");
  const tMembers = useTranslations("members");
  const [query, setQuery] = useState("");

  const ministryLeaders = useMemo(
    () =>
      ministry
        ? resolveMinistryLeaders(ministry, members).filter(
            (member) => member.isActive,
          )
        : [],
    [ministry, members],
  );

  const leaderIds = useMemo(
    () => new Set(ministryLeaders.map((member) => member.memberId)),
    [ministryLeaders],
  );

  const ministryMembers = useMemo(() => {
    if (!ministry) return [];
    return resolveMinistryMembers(ministry, members).filter(
      (member) => member.isActive && !leaderIds.has(member.memberId),
    );
  }, [ministry, members, leaderIds]);

  const filteredLeaders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ministryLeaders;
    return ministryLeaders.filter((member) => matchesMemberQuery(member, q));
  }, [ministryLeaders, query]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ministryMembers;
    return ministryMembers.filter((member) => matchesMemberQuery(member, q));
  }, [ministryMembers, query]);

  const totalPeople = ministryLeaders.length + ministryMembers.length;
  const hasResults = filteredLeaders.length + filteredMembers.length > 0;
  const showToolbar = totalPeople > 0 || canAddMembers;

  if (!open || !ministry) return null;

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const handleAddMember = () => {
    setQuery("");
    onAddMember();
  };

  return (
    <>
      <div
        className="drawer-backdrop"
        style={{ zIndex: 60 }}
        onClick={handleClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-labelledby="ministry-members-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 61,
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          width: 520,
          maxWidth: "92vw",
          maxHeight: "min(80vh, 720px)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          boxShadow: "var(--shadow-3)",
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div
            className="row between"
            style={{
              padding: "18px 20px 16px",
              gap: 12,
            }}
          >
            <div
              className="row"
              style={{ gap: 12, alignItems: "flex-start", minWidth: 0 }}
            >
              <MinistryIcon
                name={ministry.name}
                color={ministry.color}
                size={42}
                radius={10}
              />
              <div style={{ minWidth: 0 }}>
                <div className="eyebrow">{t("ministryMembers")}</div>
                <h3
                  id="ministry-members-title"
                  style={{
                    margin: "4px 0 0",
                    fontSize: 18,
                    fontWeight: 700,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ministry.name}
                </h3>
                <div
                  className="row"
                  style={{ gap: 12, marginTop: 6, flexWrap: "wrap" }}
                >
                  <span
                    className="row muted tiny"
                    style={{ gap: 4, alignItems: "center" }}
                  >
                    <Icons.users size={12} />
                    {t("leadersCount", { count: ministryLeaders.length })}
                  </span>
                  <span
                    className="row muted tiny"
                    style={{ gap: 4, alignItems: "center" }}
                  >
                    <Icons.users size={12} />
                    {t("membersCount", { count: ministryMembers.length })}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn ghost icon-only"
              onClick={handleClose}
              aria-label={tCommon("close")}
            >
              <Icons.x size={18} />
            </button>
          </div>
          <div
            style={{
              height: 2,
              margin: "0 20px",
              background:
                "linear-gradient(90deg, var(--accent) 48px, var(--line) 48px)",
            }}
          />
        </div>

        {showToolbar ? (
          <div style={{ padding: "14px 20px 0", flexShrink: 0 }}>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                <Icons.search
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("searchMember")}
                  className="input"
                  style={{ width: "100%", paddingLeft: 36 }}
                />
              </div>
              {canAddMembers ? (
                <button
                  type="button"
                  className="btn outline sm"
                  style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                  onClick={handleAddMember}
                >
                  <Icons.plus size={14} /> {t("addMember")}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          style={{
            padding: "14px 20px 0",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <SectionHeading icon={<Icons.crown size={12} />}>
            {t("leadersInCharge")}
          </SectionHeading>
          {ministryLeaders.length === 0 ? (
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
              {t("noLeaders")}
            </p>
          ) : filteredLeaders.length === 0 ? (
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
              {tMembers("noResultsHint")}
            </p>
          ) : (
            <MemberList>
              {filteredLeaders.map((member, index) => (
                <MinistryPersonRow
                  key={member.memberId}
                  member={member}
                  isLeader
                  canViewProfiles={canViewProfiles}
                  onClose={handleClose}
                  isLast={index === filteredLeaders.length - 1}
                />
              ))}
            </MemberList>
          )}

          <SectionHeading icon={<Icons.users size={12} />}>
            {t("members")}
          </SectionHeading>
          {ministryMembers.length === 0 ? (
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
              {t("noMembers")}
            </p>
          ) : filteredMembers.length === 0 && !hasResults ? (
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
              {tMembers("noResultsHint")}
            </p>
          ) : filteredMembers.length === 0 ? (
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
              {t("noMembersMatchSearch")}
            </p>
          ) : (
            <MemberList>
              {filteredMembers.map((member, index) => (
                <MinistryPersonRow
                  key={member.memberId}
                  member={member}
                  isLeader={false}
                  canViewProfiles={canViewProfiles}
                  onClose={handleClose}
                  isLast={index === filteredMembers.length - 1}
                />
              ))}
            </MemberList>
          )}
        </div>

        <div
          className="row between"
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--line)",
            gap: 12,
            flexShrink: 0,
            alignItems: "center",
          }}
        >
          <div
            className="row muted tiny"
            style={{ gap: 8, alignItems: "center", minWidth: 0 }}
          >
            <Icons.users size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span style={{ lineHeight: 1.4 }}>{t("servingTogether")}</span>
          </div>
          <button
            type="button"
            className="btn primary sm"
            style={{ flexShrink: 0 }}
            onClick={handleClose}
          >
            {tCommon("close")}
          </button>
        </div>
      </div>
    </>
  );
}
