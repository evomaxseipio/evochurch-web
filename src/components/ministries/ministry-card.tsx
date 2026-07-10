"use client";

import {
  MemberAvatarStack,
  MinistryActionMenu,
  MinistryFeaturedBadge,
  MinistryIcon,
  MinistryLeaderRow,
  MinistryStatusChip,
} from "@/components/ministries/ministry-ui";
import { Icons } from "@/components/icons";
import { formatMinistryDate } from "@/lib/ministries/parse";
import type { Ministry } from "@/lib/ministries/types";
import type { Member } from "@/lib/members/types";
import { useTranslations } from "next-intl";

export function MinistryCard({
  ministry,
  members,
  onEdit,
  onViewMembers,
  onViewFunds,
  onAssignLeader,
  onViewEvents,
  onDelete,
}: {
  ministry: Ministry;
  members: Member[];
  onEdit: () => void;
  onViewMembers: () => void;
  onViewFunds: () => void;
  onAssignLeader: () => void;
  onViewEvents: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("ministerios");

  return (
    <div
      className="card span-4"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div
        className="row between"
        style={{ alignItems: "flex-start", gap: 8 }}
      >
        <div
          className="row"
          style={{ gap: 10, alignItems: "flex-start", minWidth: 0, flex: 1 }}
        >
          <MinistryIcon name={ministry.name} color={ministry.color} size={38} />
          <div style={{ minWidth: 0 }}>
            <div
              className="display"
              style={{
                fontSize: 17,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {ministry.name}
            </div>
            <div
              style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}
            >
              <MinistryStatusChip active={ministry.isActive} />
              {ministry.isFeatured ? <MinistryFeaturedBadge /> : null}
            </div>
          </div>
        </div>
        <MinistryActionMenu
          ministry={ministry}
          onEdit={onEdit}
          onViewMembers={onViewMembers}
          onViewFunds={onViewFunds}
          onAssignLeader={onAssignLeader}
          onViewEvents={onViewEvents}
          onDelete={onDelete}
        />
      </div>

      <div
        className="muted"
        style={{
          fontSize: 12.5,
          lineHeight: 1.55,
          minHeight: 36,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {ministry.description || "—"}
      </div>

      <div>
        <div className="tiny muted" style={{ marginBottom: 6 }}>
          {t("members")}
        </div>
        <MemberAvatarStack
          memberIds={ministry.memberProfileIds}
          members={members}
          onClick={onViewMembers}
        />
      </div>

      <div
        style={{
          borderTop: "1px solid var(--hairline)",
          paddingTop: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <MinistryLeaderRow
          ministry={ministry}
          members={members}
          onClick={onViewMembers}
        />
        <span className="tiny muted row" style={{ gap: 4, flexShrink: 0 }}>
          <Icons.cal size={12} /> {formatMinistryDate(ministry.createdAt)}
        </span>
      </div>
    </div>
  );
}
