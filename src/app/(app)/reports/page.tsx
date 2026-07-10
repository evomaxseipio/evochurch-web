import { ReportsHubView } from "@/components/reports/reports-hub-view";
import { checkChurchCouncilAffiliationAction } from "@/app/(app)/reports/actions";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { hasPermission } from "@/lib/auth/permissions";
import { filterCatalogForSession, REPORT_CATALOG } from "@/lib/reports/catalog";
import { canExportReport } from "@/lib/reports/permissions";
import { isReportId, type ReportId } from "@/lib/reports/types";
import { fetchChurchReportDefinitions } from "@/lib/services/report-definitions";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";

function parseReportParam(value: string | undefined): ReportId | null {
  if (!value || !isReportId(value)) return null;
  return value;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; open?: string }>;
}) {
  const session = await requirePageAccess("/reports");
  const locale = await getLocale();
  const t = await getTranslations("reports");
  const supabase = await createClient();
  const reportDefinitions = await fetchChurchReportDefinitions(
    supabase,
    session.churchId,
  );
  const catalog = filterCatalogForSession(session, REPORT_CATALOG, reportDefinitions);
  const localizedCatalog = catalog.map((entry) => ({
    ...entry,
    title: t(`catalog.${entry.id}.title`),
    description: t(`catalog.${entry.id}.description`),
    rolesHint: t(`catalog.${entry.id}.rolesHint`),
  }));
  const exportableReportIds = localizedCatalog
    .filter((entry) => canExportReport(session, entry.id))
    .map((entry) => entry.id);
  const { report, open } = await searchParams;
  const initialReportId = parseReportParam(report);
  const autoOpenReport = open === "1" || open === "true";
  const affiliation = await checkChurchCouncilAffiliationAction();
  const canManageReportTemplates = hasPermission(
    session,
    "settings:discount_templates:write",
  );

  return (
    <ReportsHubView
      catalog={localizedCatalog}
      exportableReportIds={exportableReportIds}
      churchName={session.churchName}
      locale={locale}
      councilAffiliated={affiliation.affiliated}
      reportDefinitions={reportDefinitions}
      canManageReportTemplates={canManageReportTemplates}
      initialReportId={
        initialReportId &&
        localizedCatalog.some((entry) => entry.id === initialReportId)
          ? initialReportId
          : null
      }
      autoOpenReport={autoOpenReport && initialReportId != null}
    />
  );
}
