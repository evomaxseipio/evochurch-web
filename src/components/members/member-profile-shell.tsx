"use client";

import { MemberProfileView } from "@/components/members/member-profile-view";
import type { ProfileTabId } from "@/components/members/member-profile-toolbar";
import type { MemberRoleCatalog } from "@/lib/members/roles";
import type { Member, MembershipRecord, MemberFinanceData } from "@/lib/members/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const TABS: ProfileTabId[] = [
  "profile",
  "membership",
  "labor",
  "finances",
  "delete",
];

const LEGACY_TAB_MAP: Record<string, ProfileTabId> = {
  health: "profile",
  professions: "labor",
  employment: "labor",
};

function parseTab(value: string | null): ProfileTabId {
  if (value && LEGACY_TAB_MAP[value]) {
    return LEGACY_TAB_MAP[value];
  }
  if (value && TABS.includes(value as ProfileTabId)) {
    return value as ProfileTabId;
  }
  return "profile";
}

export function MemberProfileShell({
  member: memberFromServer,
  roles,
  membership: membershipFromServer,
  finances = null,
  canWriteMembers,
  canDeleteMembers,
  canReadMemberFinances,
  canWriteContributions,
}: {
  member: Member;
  roles: MemberRoleCatalog[];
  membership: MembershipRecord | null;
  finances?: MemberFinanceData | null;
  canWriteMembers: boolean;
  canDeleteMembers: boolean;
  canReadMemberFinances: boolean;
  canWriteContributions: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ProfileTabId>(() =>
    parseTab(searchParams.get("tab")),
  );
  const [member, setMember] = useState(memberFromServer);
  const [membership, setMembership] = useState(membershipFromServer);
  const [prevMemberFromServer, setPrevMemberFromServer] =
    useState(memberFromServer);
  const [prevMembershipFromServer, setPrevMembershipFromServer] =
    useState(membershipFromServer);

  useEffect(() => {
    const raw = searchParams.get("tab");
    if (!raw || !LEGACY_TAB_MAP[raw]) return;
    const next = LEGACY_TAB_MAP[raw];
    const params = new URLSearchParams(searchParams.toString());
    if (next === "profile") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
    setTab(next);
  }, [searchParams, router]);

  if (memberFromServer !== prevMemberFromServer) {
    setPrevMemberFromServer(memberFromServer);
    setMember(memberFromServer);
  }

  if (membershipFromServer !== prevMembershipFromServer) {
    setPrevMembershipFromServer(membershipFromServer);
    setMembership(membershipFromServer);
  }

  function handleTabChange(next: ProfileTabId) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "profile") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
    if (next === "finances") {
      router.refresh();
    }
  }

  return (
    <div className="flex-1 p-4 lg:p-6">
      <MemberProfileView
        member={member}
        roles={roles}
        membership={membership}
        tab={tab}
        onTabChange={handleTabChange}
        onMemberUpdated={setMember}
        onMembershipUpdated={setMembership}
        finances={finances}
        canWriteMembers={canWriteMembers}
        canDeleteMembers={canDeleteMembers}
        canReadMemberFinances={canReadMemberFinances}
        canWriteContributions={canWriteContributions}
      />
    </div>
  );
}
