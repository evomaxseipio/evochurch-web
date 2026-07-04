"use client";

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
}: {
  member: Member;
  isLeader: boolean;
  canViewProfiles: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("ministerios");
  const tMembers = useTranslations("members");
  const initials = memberInitials(member);
  const profileHref = `/members/profile?id=${member.memberId}`;

  return (
    <li
      className="row"
      style={{
        gap: 12,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid var(--hairline)",
        background: isLeader
          ? "color-mix(in oklab, var(--accent) 6%, var(--surface))"
          : "var(--surface)",
        alignItems: "center",
      }}
    >
      <span
        className="avatar md"
        style={{ background: avatarGradient(initials) }}
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
              <Icons.star size={10} /> {t("leader")}
            </span>
          ) : null}
        </div>
        {member.contact.email || member.contact.mobilePhone ? (
          <div className="muted tiny" style={{ marginTop: 4 }}>
            {[member.contact.email, member.contact.mobilePhone]
              .filter(Boolean)
              .join(" · ")}
          </div>
        ) : null}
      </div>
      {canViewProfiles ? (
        <Link
          href={profileHref}
          className="btn ghost sm"
          style={{ flexShrink: 0 }}
          onClick={onClose}
        >
          {tMembers("viewProfile")}
        </Link>
      ) : null}
    </li>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="tiny muted"
      style={{
        margin: "0 0 8px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

export function MinistryMembersDialog({
  ministry,
  members,
  canViewProfiles,
  open,
  onClose,
}: {
  ministry: Ministry | null;
  members: Member[];
  canViewProfiles: boolean;
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

  if (!open || !ministry) return null;

  const handleClose = () => {
    setQuery("");
    onClose();
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
        <div
          className="row between"
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--line)",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div className="row" style={{ gap: 12, alignItems: "flex-start", minWidth: 0 }}>
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
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ministry.name}
              </h3>
              <div className="muted tiny" style={{ marginTop: 4 }}>
                {t("leadersCount", { count: ministryLeaders.length })}
                {" · "}
                {t("membersCount", { count: ministryMembers.length })}
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

        {totalPeople > 0 ? (
          <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
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
          </div>
        ) : null}

        <div
          style={{
            padding: "12px 20px 20px",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <SectionHeading>{t("leadersInCharge")}</SectionHeading>
          {ministryLeaders.length === 0 ? (
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
              {t("noLeaders")}
            </p>
          ) : filteredLeaders.length === 0 ? (
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
              {tMembers("noResultsHint")}
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: "0 0 16px",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {filteredLeaders.map((member) => (
                <MinistryPersonRow
                  key={member.memberId}
                  member={member}
                  isLeader
                  canViewProfiles={canViewProfiles}
                  onClose={handleClose}
                />
              ))}
            </ul>
          )}

          <SectionHeading>{t("members")}</SectionHeading>
          {ministryMembers.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              {t("noMembers")}
            </p>
          ) : filteredMembers.length === 0 && !hasResults ? (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              {tMembers("noResultsHint")}
            </p>
          ) : filteredMembers.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              {t("noMembersMatchSearch")}
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {filteredMembers.map((member) => (
                <MinistryPersonRow
                  key={member.memberId}
                  member={member}
                  isLeader={false}
                  canViewProfiles={canViewProfiles}
                  onClose={handleClose}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
