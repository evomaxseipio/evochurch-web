import { FundsListView } from "@/components/funds/funds-list-view";
import { computeFundsStats } from "@/lib/funds/parse";
import { fetchFunds } from "@/lib/services/funds";
import { fetchMinistries } from "@/lib/services/ministries";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function FundsPage() {
  const tErrors = await getTranslations("errors");
  const session = await requirePageAccess("/finances/funds");

  const supabase = await createClient();

  let error: string | null = null;
  let funds: Awaited<ReturnType<typeof fetchFunds>> = [];
  let ministries: Awaited<ReturnType<typeof fetchMinistries>> = [];

  try {
    [funds, ministries] = await Promise.all([
      fetchFunds(supabase, session.churchId),
      fetchMinistries(supabase, session.churchId),
    ]);
  } catch (e) {
    error =
      e instanceof Error ? e.message : tErrors("loadFailed");
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
        <FundsListView
          funds={funds}
          stats={stats}
          ministries={ministries}
          permissions={session.permissions}
        />
      )}
    </>
  );
}
