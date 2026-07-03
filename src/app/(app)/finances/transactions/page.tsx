import { TransactionsListView } from "@/components/transactions/transactions-list-view";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { defaultYearToDateRange } from "@/lib/finance/date-range";
import {
  parseFinancePage,
  parseFinancePageSize,
  parseLedgerStatusFilter,
} from "@/lib/finance/pagination";
import { fetchFunds } from "@/lib/services/funds";
import {
  fetchExpenseTypes,
  fetchFinanceLedgerPage,
  fetchOperationalIncomeTypes,
} from "@/lib/services/ledger";
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    fund?: string;
    page?: string;
    size?: string;
    from?: string;
    to?: string;
    status?: string;
  }>;
}) {
  const session = await requirePageAccess("/finances/transactions");

  const params = await searchParams;
  const fundId = params.fund ?? null;
  const page = parseFinancePage(params.page);
  const pageSize = parseFinancePageSize(params.size);
  const status = parseLedgerStatusFilter(params.status);
  const defaultRange = defaultYearToDateRange();
  const dateFrom = params.from ?? defaultRange.from;
  const dateTo = params.to ?? defaultRange.to;

  const supabase = await createClient();

  let error: string | null = null;
  let pageResult: Awaited<ReturnType<typeof fetchFinanceLedgerPage>> | null =
    null;
  let funds: Awaited<ReturnType<typeof fetchFunds>> = [];
  let expenseTypes: Awaited<ReturnType<typeof fetchExpenseTypes>> = [];
  let incomeTypes: Awaited<ReturnType<typeof fetchOperationalIncomeTypes>> = [];

  try {
    [pageResult, funds, expenseTypes, incomeTypes] = await Promise.all([
      fetchFinanceLedgerPage(supabase, {
        churchId: session.churchId,
        fundId,
        dateFrom,
        dateTo,
        status,
        page,
        pageSize,
      }),
      fetchFunds(supabase, session.churchId),
      fetchExpenseTypes(supabase, session.churchId),
      fetchOperationalIncomeTypes(supabase, session.churchId),
    ]);
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "No se pudieron cargar las transacciones.";
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
        <TransactionsListView
          entries={pageResult.entries}
          totalCount={pageResult.totalCount}
          periodStats={pageResult.periodStats}
          funds={funds}
          expenseTypes={expenseTypes}
          incomeTypes={incomeTypes}
          fundFilterId={fundId}
          fundFilterName={fundFilterName}
          canAuthorizeFinances={session.canAuthorizeFinances}
          page={page}
          pageSize={pageSize}
          dateFrom={dateFrom}
          dateTo={dateTo}
          statusFilter={status}
        />
      ) : null}
    </>
  );
}
