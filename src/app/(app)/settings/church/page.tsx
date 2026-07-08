import { ChurchProfileView } from "@/components/settings/church-profile-view";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import {
  fetchChurchProfile,
  resolveChurchLogoSignedUrl,
} from "@/lib/services/church-profile";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function ChurchSettingsPage() {
  const tErrors = await getTranslations("errors");
  const session = await requirePageAccess("/settings/church");
  const canWrite = hasPermission(session, "settings:church:write");

  const supabase = await createClient();
  let error: string | null = null;
  let profile: Awaited<ReturnType<typeof fetchChurchProfile>> | null = null;
  let logoSignedUrl: string | null = null;

  try {
    profile = await fetchChurchProfile(supabase, session.churchId);
    logoSignedUrl = await resolveChurchLogoSignedUrl(supabase, profile.logoUrl);
  } catch (e) {
    error = e instanceof Error ? e.message : tErrors("loadFailed");
  }

  if (error || !profile) {
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
    <ChurchProfileView
      profile={profile}
      logoSignedUrl={logoSignedUrl}
      canWrite={canWrite}
    />
  );
}
