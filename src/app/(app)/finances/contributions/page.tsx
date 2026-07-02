import { ContributionsListView } from "@/components/contributions/contributions-list-view";
import {
  fetchIncomeEntriesPage,
  fetchIncomeTypes,
} from "@/lib/services/contributions";
import { fetchFunds } from "@/lib/services/funds";
import {
  contributionDateBoundsFromMonth,
  parseContributionCategoryFilter,
  parseFinancePage,
  parseFinancePageSize,
  parseYearMonthParam,
} from "@/lib/finance/pagination";
import { getAppSession } from "@/lib/auth/app-session";
import { createClient } from "@/lib/supabase/server";

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    fund?: string;
    page?: string;
    size?: string;
    month?: string;
    category?: string;
  }>;
}) {
  const session = await getAppSession();
  if (!session) return null;

  const params = await searchParams;
  const fundId = params.fund ?? null;
  const page = parseFinancePage(params.page);
  const pageSize = parseFinancePageSize(params.size);
  const month = parseYearMonthParam(params.month);
  const category = parseContributionCategoryFilter(params.category);
  const { from, to } = contributionDateBoundsFromMonth(month);

  const supabase = await createClient();

  let error: string | null = null;
  let pageResult: Awaited<ReturnType<typeof fetchIncomeEntriesPage>> | null =
    null;
  let funds: Awaited<ReturnType<typeof fetchFunds>> = [];
  let incomeTypes: Awaited<ReturnType<typeof fetchIncomeTypes>> = [];

  try {
    const churchId = session.churchId;
    [pageResult, funds, incomeTypes] = await Promise.all([
      fetchIncomeEntriesPage(supabase, {
        churchId,
        fundId,
        dateFrom: from,
        dateTo: to,
        category,
        page,
        pageSize,
      }),
      fetchFunds(supabase, churchId),
      fetchIncomeTypes(supabase, churchId),
    ]);
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "No se pudieron cargar las contribuciones.";
  }

  const fundFilterName = fundId
    ? funds.find((f) => f.fundId === fundId)?.name ?? null
    : null;

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
      ) : pageResult ? (
        <ContributionsListView
          entries={pageResult.entries}
          totalCount={pageResult.totalCount}
          periodStats={pageResult.periodStats}
          funds={funds}
          incomeTypes={incomeTypes}
          fundFilterId={fundId}
          fundFilterName={fundFilterName}
          page={page}
          pageSize={pageSize}
          month={month}
          category={category}
        />
      ) : null}
    </>
  );
}
