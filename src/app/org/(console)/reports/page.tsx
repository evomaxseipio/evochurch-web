import { OrgReportsView } from "@/components/org/org-reports-view";
import { requireOrgPageAccess } from "@/lib/auth/require-org-page-access";
import { fetchOrgSubmittedReports } from "@/lib/services/org-portal";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function OrgReportsPage() {
  const tErrors = await getTranslations("errors");
  const session = await requireOrgPageAccess("/org/reports");

  const supabase = await createClient();
  let error: string | null = null;
  let reports: Awaited<ReturnType<typeof fetchOrgSubmittedReports>> = [];

  try {
    reports = await fetchOrgSubmittedReports(supabase, session.organizationId);
  } catch (e) {
    error = e instanceof Error ? e.message : tErrors("loadFailed");
  }

  if (error) {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
      >
        {error}
      </p>
    );
  }

  return (
    <OrgReportsView
      organizationName={session.organizationName}
      reports={reports}
    />
  );
}
