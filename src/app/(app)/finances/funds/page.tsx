import { FundsListView } from "@/components/funds/funds-list-view";
import { computeFundsStats } from "@/lib/funds/parse";
import { fetchFunds } from "@/lib/services/funds";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { createClient } from "@/lib/supabase/server";

export default async function FundsPage() {
  const session = await requirePageAccess("/finances/funds");

  const supabase = await createClient();

  let error: string | null = null;
  let funds: Awaited<ReturnType<typeof fetchFunds>> = [];

  try {
    funds = await fetchFunds(supabase, session.churchId);
  } catch (e) {
    error =
      e instanceof Error ? e.message : "No se pudieron cargar los fondos.";
  }

  const stats = computeFundsStats(funds);

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
        <FundsListView funds={funds} stats={stats} />
      )}
    </>
  );
}
