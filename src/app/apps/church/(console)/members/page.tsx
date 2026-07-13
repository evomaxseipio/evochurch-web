import { MembersListView } from "@/components/members/members-list-view";
import type { MemberRoleCatalog } from "@/lib/members/roles";
import { parseMembersPageSize } from "@/lib/members/pagination";
import { fetchChurchAuthUsers } from "@/lib/services/admin-users";
import { fetchAssignableRoles } from "@/lib/services/roles";
import { fetchMemberRoles, fetchMembersPage } from "@/lib/services/members";
import type { AssignableRole } from "@/lib/roles/types";
import type { MemberFilterKey } from "@/lib/members/types";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import {
  canDeleteMembers,
  canWriteContributions,
  canWriteMembers,
} from "@/lib/auth/permissions";
import { canManageAdminUsers } from "@/lib/auth/require-admin-session";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

const FILTERS: MemberFilterKey[] = [
  "all",
  "members",
  "visits",
  "active",
  "inactive",
];

function parseFilter(value: string | undefined): MemberFilterKey {
  if (value && FILTERS.includes(value as MemberFilterKey)) {
    return value as MemberFilterKey;
  }
  return "all";
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string; q?: string; size?: string }>;
}) {
  const session = await requirePageAccess("/members");
  const tErrors = await getTranslations("errors");

  const canWriteMembersFlag = canWriteMembers(session);
  const canDeleteMembersFlag = canDeleteMembers(session);
  const canWriteContributionsFlag = canWriteContributions(session);

  const { page: pageRaw, filter: filterRaw, q, size: sizeRaw } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
  const filter = parseFilter(filterRaw);
  const query = (q ?? "").trim();
  const pageSize = parseMembersPageSize(sizeRaw);

  const supabase = await createClient();
  const canManageUsers = canManageAdminUsers(session);

  let error: string | null = null;
  let listData: Awaited<ReturnType<typeof fetchMembersPage>> | null = null;
  let roles: MemberRoleCatalog[] = [];
  let systemAccessProfileIds: string[] = [];
  let assignableRoles: AssignableRole[] = [];

  try {
    const churchId = session.churchId;
    const authUsersPromise = canManageUsers
      ? fetchChurchAuthUsers(supabase, churchId).catch(() => [])
      : Promise.resolve([]);
    const assignableRolesPromise = canManageUsers
      ? fetchAssignableRoles(supabase, churchId).catch(() => [])
      : Promise.resolve([]);

    const [membersResult, rolesResult, authUsers, rolesForUsers] =
      await Promise.all([
      fetchMembersPage(supabase, {
        churchId,
        page,
        pageSize,
        filter,
        search: query || null,
      }),
      fetchMemberRoles(supabase).catch(() => [] as MemberRoleCatalog[]),
      authUsersPromise,
      assignableRolesPromise,
    ]);

    listData = membersResult;
    roles = rolesResult;
    assignableRoles = rolesForUsers;
    systemAccessProfileIds = authUsers
      .map((u) => u.profileId)
      .filter((id): id is string => Boolean(id));
  } catch (e) {
    error = e instanceof Error ? e.message : tErrors("loadFailed");
  }

  return (
    <>
      {error ? (
        <p
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: "var(--danger-bg)",
            color: "var(--danger)",
          }}
        >
          {error}
        </p>
      ) : listData ? (
        <MembersListView
          key={`${filter}|${query}|${page}|${pageSize}`}
          members={listData.members}
          roles={roles}
          stats={listData.stats}
          pagination={listData.pagination}
          filter={filter}
          query={query}
          canManageUsers={canManageUsers}
          canWriteMembers={canWriteMembersFlag}
          canDeleteMembers={canDeleteMembersFlag}
          canWriteContributions={canWriteContributionsFlag}
          systemAccessProfileIds={systemAccessProfileIds}
          assignableRoles={assignableRoles}
        />
      ) : null}
    </>
  );
}
