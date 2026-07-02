import { MembersListView } from "@/components/members/members-list-view";
import { parseMembersPageSize } from "@/lib/members/pagination";
import { fetchChurchAuthUsers } from "@/lib/services/admin-users";
import { fetchMemberRoles, fetchMembersPage } from "@/lib/services/members";
import type { MemberFilterKey } from "@/lib/members/types";
import { getAppSession } from "@/lib/auth/app-session";
import { canManageAdminUsers } from "@/lib/auth/require-admin-session";
import { createClient } from "@/lib/supabase/server";

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
  const session = await getAppSession();
  if (!session) {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{
          background: "var(--danger-bg)",
          color: "var(--danger)",
        }}
      >
        No se pudo cargar la sesión de la iglesia. Recarga la página o vuelve a
        iniciar sesión.
      </p>
    );
  }

  const { page: pageRaw, filter: filterRaw, q, size: sizeRaw } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
  const filter = parseFilter(filterRaw);
  const query = (q ?? "").trim();
  const pageSize = parseMembersPageSize(sizeRaw);

  const supabase = await createClient();
  const canManageUsers = canManageAdminUsers(session);

  let error: string | null = null;
  let listData: Awaited<ReturnType<typeof fetchMembersPage>> | null = null;
  let roles: string[] = [];
  let systemAccessProfileIds: string[] = [];

  try {
    const churchId = session.churchId;
    const authUsersPromise = canManageUsers
      ? fetchChurchAuthUsers(supabase, churchId).catch(() => [])
      : Promise.resolve([]);

    const [membersResult, rolesResult, authUsers] = await Promise.all([
      fetchMembersPage(supabase, {
        churchId,
        page,
        pageSize,
        filter,
        search: query || null,
      }),
      fetchMemberRoles(supabase).catch(() => [] as string[]),
      authUsersPromise,
    ]);

    listData = membersResult;
    roles = rolesResult;
    systemAccessProfileIds = authUsers
      .map((u) => u.profileId)
      .filter((id): id is string => Boolean(id));
  } catch (e) {
    error =
      e instanceof Error ? e.message : "No se pudieron cargar los miembros.";
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
          systemAccessProfileIds={systemAccessProfileIds}
        />
      ) : null}
    </>
  );
}
