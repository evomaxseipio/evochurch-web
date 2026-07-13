import { SettingsView } from "@/components/settings/settings-view";
import { getSessionDisplayRole } from "@/lib/auth/app-session";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { getTranslations } from "next-intl/server";

export default async function SettingsPage() {
  const session = await requirePageAccess("/settings");
  const tCommon = await getTranslations("common");

  const fullName =
    session.fullName?.trim() ||
    session.email.split("@")[0] ||
    tCommon("user");

  return (
    <SettingsView
      fullName={fullName}
      email={session.email}
      roleLabel={getSessionDisplayRole(session)}
      churchName={session.churchName}
      isVerified={session.isVerified}
    />
  );
}
