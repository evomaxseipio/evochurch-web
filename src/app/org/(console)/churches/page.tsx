import { OrgChurchesView } from "@/components/org/org-churches-view";
import { orgHasPermission } from "@/lib/auth/org-session";
import { requireOrgPageAccess } from "@/lib/auth/require-org-page-access";
import { fetchOrgChurches } from "@/lib/services/org-portal";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function OrgChurchesPage() {
  const tErrors = await getTranslations("errors");
  const session = await requireOrgPageAccess("/org/churches");

  const supabase = await createClient();
  let error: string | null = null;
  let churches: Awaited<ReturnType<typeof fetchOrgChurches>> = [];

  try {
    churches = await fetchOrgChurches(
      supabase,
      session.organizationId,
      session.orgUnitId,
    );
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
    <OrgChurchesView
      organizationName={session.organizationName}
      churches={churches}
      canProvision={orgHasPermission(session, "org:churches:provision")}
    />
  );
}
