import { churchPath } from "@/lib/apps/church-routes";
import { MemberProfileShell } from "@/components/members/member-profile-shell";
import type { MemberRoleCatalog } from "@/lib/members/roles";
import type { Member, MembershipRecord, MemberFinanceData } from "@/lib/members/types";
import type { MemberFamilyData } from "@/lib/members/family";
import type { PastoralEvent } from "@/lib/members/pastoral-events";
import {
  fetchMemberById,
  fetchMemberRoles,
  fetchMembership,
  fetchMembersPage,
} from "@/lib/services/members";
import { fetchProfilePastoralEvents } from "@/lib/services/pastoral-events";
import { fetchMemberFinancePayload } from "@/lib/services/member-finances";
import type { ChildListItem } from "@/lib/children/types";
import { fetchChildrenPage } from "@/lib/services/children";
import { fetchMemberFamily } from "@/lib/services/member-family";
import { getAppSession } from "@/lib/auth/app-session";
import { hasPermission, canWriteMembers, canDeleteMembers, canWriteContributions } from "@/lib/auth/permissions";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type ProfileData =
  | { kind: "missing-id" }
  | { kind: "not-found" }
  | { kind: "error"; errorKey: string }
  | {
      kind: "ok";
      member: Member;
      roles: MemberRoleCatalog[];
      membership: MembershipRecord | null;
      finances: MemberFinanceData | null;
      pastoralEvents: PastoralEvent[];
      family: MemberFamilyData | null;
      adultMembers: Member[];
      ministryChildren: ChildListItem[];
    };

async function loadProfileData(
  id: string | undefined,
  tab: string | undefined,
): Promise<ProfileData> {
  if (!id) return { kind: "missing-id" };

  const supabase = await createClient();
  const session = await getAppSession();

  if (!session) return { kind: "error", errorKey: "errors.sessionInvalid" };

  try {
    const churchId = session.churchId;
    const loadFinances = tab === "finances";
    const loadFamily = tab === "family";

    const [member, roles, finances, pastoralEvents, familyBundle] =
      await Promise.all([
      fetchMemberById(supabase, churchId, id),
      fetchMemberRoles(supabase).catch(() => [] as MemberRoleCatalog[]),
      loadFinances
        ? fetchMemberFinancePayload(supabase, churchId, id).catch(() => null)
        : Promise.resolve(null),
      fetchProfilePastoralEvents(supabase, churchId, id).catch(() => []),
      loadFamily
        ? Promise.all([
            fetchMemberFamily(supabase, churchId, id).catch(() => ({
              spouse: null,
              parents: [],
              children: [],
            })),
            fetchMembersPage(supabase, {
              churchId,
              page: 1,
              pageSize: null,
              filter: "all",
            }).catch(() => ({ members: [] as Member[] })),
            fetchChildrenPage(supabase, {
              churchId,
              page: 1,
              pageSize: 500,
            }).catch(() => ({ children: [] as ChildListItem[] })),
          ])
        : Promise.resolve(null),
    ]);

    if (!member) return { kind: "not-found" };

    if (member.isChild) {
      redirect(churchPath(`/members/children/${id}`));
    }

    const membership = await fetchMembership(supabase, churchId, id).catch(
      () => null,
    );

    const family = familyBundle?.[0] ?? null;
    const adultMembers = familyBundle?.[1]?.members ?? [];
    const ministryChildren = familyBundle?.[2]?.children ?? [];

    return {
      kind: "ok",
      member,
      roles,
      membership,
      finances,
      pastoralEvents,
      family,
      adultMembers,
      ministryChildren,
    };
  } catch {
    return {
      kind: "error",
      errorKey: "errors.loadFailed",
    };
  }
}

export default async function MemberProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tab?: string }>;
}) {
  const tMembers = await getTranslations("members");
  const tErrors = await getTranslations("errors");
  const tCommon = await getTranslations("common");
  const session = await requirePageAccess("/members");
  const { id, tab } = await searchParams;
  const data = await loadProfileData(id, tab);

  const canWriteMembersFlag = canWriteMembers(session);
  const canDeleteMembersFlag = canDeleteMembers(session);
  const canReadMemberFinances = hasPermission(
    session,
    "finances:contributions:read",
  );
  const canWriteContributionsFlag = canWriteContributions(session);

  if (data.kind === "missing-id") {
    return (
      <div className="p-6">
        <p className="text-sm text-muted">
          {tMembers("missingMemberId")}{" "}
          <Link href={churchPath("/members")} className="text-primary underline">
            {tMembers("backToList")}
          </Link>
        </p>
      </div>
    );
  }

  if (data.kind === "not-found") {
    return (
      <div className="p-6">
        <p className="text-sm text-muted">
          {tErrors("memberNotFound")}{" "}
          <Link href={churchPath("/members")} className="text-primary underline">
            {tMembers("backToList")}
          </Link>
        </p>
      </div>
    );
  }

  if (data.kind === "error") {
    return (
      <div className="p-6">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {data.errorKey === "errors.sessionInvalid"
            ? tErrors("sessionInvalid")
            : tErrors("loadFailed")}
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">{tCommon("loading")}</div>}>
      <MemberProfileShell
        key={data.member.memberId}
        member={data.member}
        roles={data.roles}
        membership={data.membership}
        finances={data.finances}
        pastoralEvents={data.pastoralEvents}
        family={data.family}
        adultMembers={data.adultMembers}
        ministryChildren={data.ministryChildren}
        canWriteMembers={canWriteMembersFlag}
        canDeleteMembers={canDeleteMembersFlag}
        canReadMemberFinances={canReadMemberFinances}
        canWriteContributions={canWriteContributionsFlag}
      />
    </Suspense>
  );
}
