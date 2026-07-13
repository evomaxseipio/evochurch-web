import { FamilyHouseholdDetailView } from "@/components/reports/family-household-detail-view";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { canReadMembers } from "@/lib/auth/permissions";
import { churchPath } from "@/lib/apps/church-routes";
import { fetchFamilyHousehold } from "@/lib/services/family-report";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function FamilyHouseholdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePageAccess("/reports/families");
  if (!canReadMembers(session)) {
    redirect(`${churchPath("/settings")}?denied=1`);
  }

  const { id } = await params;
  const t = await getTranslations("reports.families");
  const tErrors = await getTranslations("errors");
  const supabase = await createClient();

  let error: string | null = null;
  let household: Awaited<ReturnType<typeof fetchFamilyHousehold>> = null;

  try {
    household = await fetchFamilyHousehold(supabase, session.churchId, id);
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

  if (!household) {
    return (
      <div className="card empty-state" style={{ margin: "40px auto", maxWidth: 480, textAlign: "center", padding: 40 }}>
        <h2 style={{ marginBottom: 8 }}>{t("notFoundTitle")}</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          {t("notFoundHint")}
        </p>
        <Link className="btn outline" href={churchPath("/reports/families")}>
          ← {t("backToList")}
        </Link>
      </div>
    );
  }

  // Normalize URL if user opened spouse id rather than LEAST uuid anchor
  if (household.anchorProfileId !== id) {
    redirect(churchPath(`/reports/families/${household.anchorProfileId}`));
  }

  return (
    <FamilyHouseholdDetailView
      household={household}
      churchName={session.churchName}
    />
  );
}
