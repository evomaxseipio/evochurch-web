import { TransactionsListView } from "@/components/transactions/transactions-list-view";
import { getAppSession } from "@/lib/auth/app-session";
import { fetchFunds } from "@/lib/services/funds";
import {
  fetchExpenseTypes,
  fetchFinanceLedger,
  fetchOperationalIncomeTypes,
} from "@/lib/services/ledger";
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string }>;
}) {
  const session = await getAppSession();
  if (!session) return null;

  const { fund: fundId } = await searchParams;
  const supabase = await createClient();

  let error: string | null = null;
  let entries: Awaited<ReturnType<typeof fetchFinanceLedger>>["entries"] = [];
  let funds: Awaited<ReturnType<typeof fetchFunds>> = [];
  let expenseTypes: Awaited<ReturnType<typeof fetchExpenseTypes>> = [];
  let incomeTypes: Awaited<ReturnType<typeof fetchOperationalIncomeTypes>> = [];

  try {
    const [ledgerResult, fundsResult, expenseTypesResult, incomeTypesResult] =
      await Promise.all([
        fetchFinanceLedger(supabase, session.churchId, {
          fundId: fundId || null,
        }),
        fetchFunds(supabase, session.churchId),
        fetchExpenseTypes(supabase, session.churchId),
        fetchOperationalIncomeTypes(supabase, session.churchId),
      ]);
    entries = ledgerResult.entries;
    funds = fundsResult;
    expenseTypes = expenseTypesResult;
    incomeTypes = incomeTypesResult;
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
      ) : (
        <TransactionsListView
          entries={entries}
          funds={funds}
          expenseTypes={expenseTypes}
          incomeTypes={incomeTypes}
          fundFilterId={fundId ?? null}
          fundFilterName={fundFilterName}
          canAuthorizeFinances={session.canAuthorizeFinances}
        />
      )}
    </>
  );
}
