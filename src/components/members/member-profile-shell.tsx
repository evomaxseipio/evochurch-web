"use client";

import { MemberProfileView } from "@/components/members/member-profile-view";
import type { ProfileTabId } from "@/components/members/member-profile-toolbar";
import type { Member, MembershipRecord } from "@/lib/members/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const TABS: ProfileTabId[] = ["profile", "membership", "finances", "delete"];

function parseTab(value: string | null): ProfileTabId {
  if (value && TABS.includes(value as ProfileTabId)) {
    return value as ProfileTabId;
  }
  return "profile";
}

export function MemberProfileShell({
  member: memberFromServer,
  roles,
  membership: membershipFromServer,
}: {
  member: Member;
  roles: string[];
  membership: MembershipRecord | null;
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
      />
    </div>
  );
}
