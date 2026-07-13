import { FamilyHouseholdsListView } from "@/components/reports/family-households-list-view";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { canReadMembers } from "@/lib/auth/permissions";
import { churchPath } from "@/lib/apps/church-routes";
import {
  isFamilyHouseholdFilter,
  type FamilyHouseholdFilter,
} from "@/lib/reports/family-household";
import { fetchFamilyHouseholdsPage } from "@/lib/services/family-report";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function parsePageSize(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "25", 10);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])
    ? parsed
    : 25;
}

export default async function FamilyHouseholdsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; filter?: string; size?: string }>;
}) {
  const session = await requirePageAccess("/reports/families");
  if (!canReadMembers(session)) {
    redirect(`${churchPath("/settings")}?denied=1`);
  }

  const tErrors = await getTranslations("errors");
  const { page: pageRaw, q, filter: filterRaw, size: sizeRaw } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
  const query = (q ?? "").trim();
  const filter: FamilyHouseholdFilter =
    filterRaw && isFamilyHouseholdFilter(filterRaw) ? filterRaw : "all";
  const pageSize = parsePageSize(sizeRaw);

  const supabase = await createClient();
  let error: string | null = null;
  let listData: Awaited<ReturnType<typeof fetchFamilyHouseholdsPage>> | null =
    null;

  try {
    listData = await fetchFamilyHouseholdsPage(supabase, session.churchId, {
      page,
      pageSize,
      search: query || null,
      filter,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : tErrors("loadFailed");
  }

  if (error) {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
      >
        {error}
      </p>
    );
  }

  if (!listData) return null;

  return (
    <FamilyHouseholdsListView
      key={`${query}|${filter}|${page}|${pageSize}`}
      initialPage={listData}
      churchName={session.churchName}
      initialSearch={query}
      initialFilter={filter}
      initialPageSize={pageSize}
    />
  );
}
