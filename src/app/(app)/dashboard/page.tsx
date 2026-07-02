import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getAppSession } from "@/lib/auth/app-session";
import { fetchDashboardPayload } from "@/lib/services/dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const session = await getAppSession();
  if (!session) return null;

  const pastorName = session.fullName?.split(" ")[0] ?? undefined;
  const churchName = session.churchName ?? null;

  let error: string | null = null;
  let payload: Awaited<ReturnType<typeof fetchDashboardPayload>> | null = null;

  try {
    const supabase = await createClient();
    payload = await fetchDashboardPayload(supabase, session.churchId);
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "No se pudo cargar el dashboard.";
  }

  if (error || !payload) {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{
          background: "var(--danger-bg)",
          color: "var(--danger)",
        }}
      >
        {error ?? "No se pudo cargar el dashboard."}
      </p>
    );
  }

  return (
    <DashboardView
      pastorName={pastorName}
      churchName={churchName}
      hero={payload.hero}
      kpis={payload.kpis}
      contributionCharts={payload.contributionCharts}
      ledgerCharts={payload.ledgerCharts}
      contributionPeriodTotals={payload.contributionPeriodTotals}
      pendingItems={payload.pendingItems}
    />
  );
}
