import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { canReadAuditLog } from "@/lib/auth/permissions";
import { resolveDashboardKpiLabels } from "@/lib/dashboard/resolve-kpi";
import type { Locale } from "@/i18n/config";
import { fetchDashboardPayload } from "@/lib/services/dashboard";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const session = await requirePageAccess("/dashboard");

  const pastorName = session.fullName?.split(" ")[0] ?? undefined;
  const churchName = session.churchName ?? null;

  let error: string | null = null;
  let payload: Awaited<ReturnType<typeof fetchDashboardPayload>> | null = null;

  try {
    const supabase = await createClient();
    payload = await fetchDashboardPayload(
      supabase,
      session.churchId,
      locale as Locale,
      { includeAuditLog: canReadAuditLog(session) },
    );
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : t("loadError");
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
        {error ?? t("loadError")}
      </p>
    );
  }

  return (
    <DashboardView
      pastorName={pastorName}
      churchName={churchName}
      hero={payload.hero}
      kpis={resolveDashboardKpiLabels(
        payload.kpis,
        (key, values) => t(key as "kpiTotalMembers", values),
        locale as Locale,
      )}
      contributionCharts={payload.contributionCharts}
      ledgerCharts={payload.ledgerCharts}
      contributionPeriodTotals={payload.contributionPeriodTotals}
      pendingItems={payload.pendingItems}
      recentAudit={payload.recentAudit}
      canViewAuditLog={canReadAuditLog(session)}
    />
  );
}
