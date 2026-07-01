import { ContributionsListView } from "@/components/contributions/contributions-list-view";
import {
  fetchIncomeEntries,
  fetchIncomeTypes,
} from "@/lib/services/contributions";
import { fetchFunds } from "@/lib/services/funds";
import { getAppSession } from "@/lib/auth/app-session";
import { createClient } from "@/lib/supabase/server";

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string }>;
}) {
  const session = await getAppSession();
  if (!session) return null;

  const { fund: fundId } = await searchParams;
  const supabase = await createClient();

  let error: string | null = null;
  let entries: Awaited<ReturnType<typeof fetchIncomeEntries>> = [];
  let funds: Awaited<ReturnType<typeof fetchFunds>> = [];
  let incomeTypes: Awaited<ReturnType<typeof fetchIncomeTypes>> = [];

  try {
    const churchId = session.churchId;
    [entries, funds, incomeTypes] = await Promise.all([
      fetchIncomeEntries(supabase, churchId, fundId || null),
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
      ) : (
        <ContributionsListView
          entries={entries}
          funds={funds}
          incomeTypes={incomeTypes}
          fundFilterId={fundId ?? null}
          fundFilterName={fundFilterName}
        />
      )}
    </>
  );
}
