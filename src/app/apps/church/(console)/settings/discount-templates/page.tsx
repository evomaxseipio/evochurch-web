import { DiscountTemplatesListView } from "@/components/discounts/discount-templates-list-view";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { hasPermission } from "@/lib/auth/permissions";
import { getDiscountLinkableReportEntries } from "@/lib/reports/catalog";
import { fetchDiscountTemplates } from "@/lib/services/discount-templates";
import { fetchChurchReportDefinitions } from "@/lib/services/report-definitions";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function DiscountTemplatesPage() {
  const tErrors = await getTranslations("errors");
  const session = await requirePageAccess("/settings/discount-templates");

  const supabase = await createClient();
  let error: string | null = null;
  let viewProps: {
    templates: Awaited<ReturnType<typeof fetchDiscountTemplates>>;
    canWrite: boolean;
    linkableReports: ReturnType<typeof getDiscountLinkableReportEntries>;
  } | null = null;

  try {
    const [fetchedTemplates, reportDefinitions] = await Promise.all([
      fetchDiscountTemplates(supabase, session.churchId),
      fetchChurchReportDefinitions(supabase, session.churchId),
    ]);

    viewProps = {
      templates: fetchedTemplates,
      canWrite: hasPermission(session, "settings:discount_templates:write"),
      linkableReports: getDiscountLinkableReportEntries(
        session,
        reportDefinitions,
      ),
    };
  } catch (e) {
    error =
      e instanceof Error ? e.message : tErrors("loadFailed");
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

  if (viewProps) {
    return (
      <DiscountTemplatesListView
        templates={viewProps.templates}
        canWrite={viewProps.canWrite}
        linkableReports={viewProps.linkableReports}
      />
    );
  }

  return null;
}
