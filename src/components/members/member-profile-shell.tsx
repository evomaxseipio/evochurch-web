"use client";

import { MemberProfileView } from "@/components/members/member-profile-view";
import type { ProfileTabId } from "@/components/members/member-profile-toolbar";
import type { MemberRoleCatalog } from "@/lib/members/roles";
import type { Member, MembershipRecord, MemberFinanceData } from "@/lib/members/types";
import type { PastoralEvent } from "@/lib/members/pastoral-events";
import type { ChildListItem } from "@/lib/children/types";
import type { MemberFamilyData } from "@/lib/members/family";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const TABS: ProfileTabId[] = [
  "profile",
  "membership",
  "labor",
  "finances",
  "family",
  "delete",
];

const LEGACY_TAB_MAP: Record<string, ProfileTabId> = {
  health: "profile",
  professions: "labor",
  employment: "labor",
  pastoral: "membership",
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

  // Misma ruta /members/profile: al cambiar de miembro, resetear tab según URL.
  useEffect(() => {
    setTab(parseTab(searchParams.get("tab")));
  }, [memberFromServer.memberId]); // eslint-disable-line react-hooks/exhaustive-deps -- solo al cambiar perfil

  if (memberFromServer !== prevMemberFromServer) {
    setPrevMemberFromServer(memberFromServer);
    setMember(memberFromServer);
  }

  if (membershipFromServer !== prevMembershipFromServer) {
    setPrevMembershipFromServer(membershipFromServer);
    setMembership(membershipFromServer);
  }

  useEffect(() => {
    const needsLazyPayload =
      (tab === "family" && family == null) ||
      (tab === "finances" && finances == null);
    if (!needsLazyPayload) return;
    router.refresh();
  }, [member.memberId, tab, family, finances, router]);

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
    if (next === "finances" || next === "family") {
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
        pastoralEvents={pastoralEvents}
        family={family}
        adultMembers={adultMembers}
        ministryChildren={ministryChildren}
        canWriteMembers={canWriteMembers}
        canDeleteMembers={canDeleteMembers}
        canReadMemberFinances={canReadMemberFinances}
        canWriteContributions={canWriteContributions}
      />
    </div>
  );
}
