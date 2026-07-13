import { ContributionsListView } from "@/components/contributions/contributions-list-view";
import {
  fetchIncomeEntriesPage,
  fetchIncomeTypes,
} from "@/lib/services/contributions";
import { fetchFunds } from "@/lib/services/funds";
import { defaultYearToDateRange } from "@/lib/finance/date-range";
import { monthDateBounds } from "@/lib/finance/month-period";
import {
  parseContributionCategoryFilter,
  parseFinancePage,
  parseFinancePageSize,
  parseYearMonthParam,
} from "@/lib/finance/pagination";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    fund?: string;
    page?: string;
    size?: string;
    from?: string;
    to?: string;
    month?: string;
    category?: string;
  }>;
}) {
  const tErrors = await getTranslations("errors");
  const session = await requirePageAccess("/finances/contributions");

  const params = await searchParams;
  const fundId = params.fund ?? null;
  const page = parseFinancePage(params.page);
  const pageSize = parseFinancePageSize(params.size);
  const category = parseContributionCategoryFilter(params.category);
  const defaultRange = defaultYearToDateRange();
  let dateFrom = params.from ?? defaultRange.from;
  let dateTo = params.to ?? defaultRange.to;

  const legacyMonth = parseYearMonthParam(params.month);
  if (legacyMonth && !params.from && !params.to) {
    const bounds = monthDateBounds(legacyMonth);
    dateFrom = bounds.from;
    dateTo = bounds.to;
  }

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
        dateFrom,
        dateTo,
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
        : tErrors("loadFailed");
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
          dateFrom={dateFrom}
          dateTo={dateTo}
          category={category}
        />
      ) : null}
    </>
  );
}
