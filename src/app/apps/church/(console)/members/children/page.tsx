import { ChildrenListView } from "@/components/children/children-list-view";
import { fetchChildrenPage } from "@/lib/services/children";
import { fetchMembersPage } from "@/lib/services/members";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { canWriteMembers } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function parsePageSize(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "25", 10);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])
    ? parsed
    : 25;
}

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; size?: string }>;
}) {
  const session = await requirePageAccess("/members/children");
  const tErrors = await getTranslations("errors");
  const { page: pageRaw, q, size: sizeRaw } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
  const query = (q ?? "").trim();
  const pageSize = parsePageSize(sizeRaw);

  const supabase = await createClient();
  let error: string | null = null;
  let listData: Awaited<ReturnType<typeof fetchChildrenPage>> | null = null;
  let adultMembers: Awaited<ReturnType<typeof fetchMembersPage>>["members"] = [];

  try {
    const [childrenResult, membersResult] = await Promise.all([
      fetchChildrenPage(supabase, {
        churchId: session.churchId,
        page,
        pageSize,
        search: query || null,
      }),
      fetchMembersPage(supabase, {
        churchId: session.churchId,
        page: 1,
        pageSize: null,
        filter: "all",
      }),
    ]);
    listData = childrenResult;
    adultMembers = membersResult.members;
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
        <ChildrenListView
          key={`${query}|${page}|${pageSize}`}
          pagination={listData.pagination}
          query={query}
          pageSize={pageSize}
          adultMembers={adultMembers}
          canWrite={canWriteMembers(session)}
        >
          {listData.children}
        </ChildrenListView>
      ) : null}
    </>
  );
}
