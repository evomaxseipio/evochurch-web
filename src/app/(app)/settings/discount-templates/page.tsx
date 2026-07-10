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
  let templates: Awaited<ReturnType<typeof fetchDiscountTemplates>> = [];
  let error: string | null = null;

  try {
    const [fetchedTemplates, reportDefinitions] = await Promise.all([
      fetchDiscountTemplates(supabase, session.churchId),
      fetchChurchReportDefinitions(supabase, session.churchId),
    ]);
    templates = fetchedTemplates;

    const canWrite = hasPermission(session, "settings:discount_templates:write");
    const linkableReports = getDiscountLinkableReportEntries(
      session,
      reportDefinitions,
    );

    return (
      <DiscountTemplatesListView
        templates={templates}
        canWrite={canWrite}
        linkableReports={linkableReports}
      />
    );
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

  return null;
}
