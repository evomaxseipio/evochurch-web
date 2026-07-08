import { ReportsHubView } from "@/components/reports/reports-hub-view";
import { checkChurchCouncilAffiliationAction } from "@/app/(app)/reports/actions";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { filterCatalogForSession } from "@/lib/reports/catalog";
import { canExportReport } from "@/lib/reports/permissions";
import { isReportId, type ReportId } from "@/lib/reports/types";
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
  const catalog = filterCatalogForSession(session);
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

  return (
    <ReportsHubView
      catalog={localizedCatalog}
      exportableReportIds={exportableReportIds}
      churchName={session.churchName}
      locale={locale}
      councilAffiliated={affiliation.affiliated}
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
