import { TitheCloseView } from "@/components/finances/tithe-close-view";
import { currentSundayWeek } from "@/lib/discounts/week-period";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { hasPermission } from "@/lib/auth/permissions";
import {
  fetchDiscountPeriodRun,
  seedDefaultTitheTemplate,
} from "@/lib/services/tithe-close";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";

function parseWeekParam(value: string | undefined): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return currentSundayWeek().periodStart;
}

export default async function TitheClosePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const tErrors = await getTranslations("errors");
  const session = await requirePageAccess("/finances/tithe-close");
  const locale = await getLocale();
  const { week } = await searchParams;
  const periodStart = parseWeekParam(week);

  const supabase = await createClient();
  let run = null;
  let noTemplate = false;
  let error: string | null = null;

  try {
    let result = await fetchDiscountPeriodRun(
      supabase,
      session.churchId,
      periodStart,
    );
    if (result.noTemplate && hasPermission(session, "settings:discount_templates:write")) {
      await seedDefaultTitheTemplate(supabase, session.churchId);
      result = await fetchDiscountPeriodRun(
        supabase,
        session.churchId,
        periodStart,
      );
    }
    run = result.run;
    noTemplate = result.noTemplate;
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

  const canWrite = hasPermission(session, "finances:tithe_close:write");
  const canManageTemplates = hasPermission(
    session,
    "settings:discount_templates:write",
  );

  return (
    <TitheCloseView
      run={run}
      noTemplate={noTemplate}
      periodStart={periodStart}
      locale={locale}
      canWrite={canWrite}
      canManageTemplates={canManageTemplates}
    />
  );
}
