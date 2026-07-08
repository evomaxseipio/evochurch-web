import { OrgSettingsView } from "@/components/org/org-settings-view";
import { requireOrgPageAccess } from "@/lib/auth/require-org-page-access";
import { fetchOrgApiKeys } from "@/lib/services/org-portal";
import { createClient } from "@/lib/supabase/server";

export default async function OrgSettingsPage() {
  const session = await requireOrgPageAccess("/org/settings");
  const supabase = await createClient();
  const apiKeys = await fetchOrgApiKeys(supabase, session.organizationId);

  return (
    <OrgSettingsView
      organizationName={session.organizationName}
      apiKeys={apiKeys}
    />
  );
}
