import { OrgDashboardView } from "@/components/org/org-dashboard-view";
import { requireOrgPageAccess } from "@/lib/auth/require-org-page-access";
import { fetchOrgDashboard } from "@/lib/services/org-portal";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function OrgDashboardPage() {
  const tErrors = await getTranslations("errors");
  const session = await requireOrgPageAccess("/org/dashboard");

  const supabase = await createClient();
  let error: string | null = null;
  let dashboard: Awaited<ReturnType<typeof fetchOrgDashboard>> | null = null;

  try {
    dashboard = await fetchOrgDashboard(supabase, session.organizationId);
  } catch (e) {
    error = e instanceof Error ? e.message : tErrors("loadFailed");
  }

  if (error || !dashboard) {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
      >
        {error ?? tErrors("loadFailed")}
      </p>
    );
  }

  return (
    <OrgDashboardView
      organizationName={session.organizationName}
      dashboard={dashboard}
    />
  );
}
