import { SettingsView } from "@/components/settings/settings-view";
import { getSessionDisplayRole } from "@/lib/auth/app-session";
import { requirePageAccess } from "@/lib/auth/require-page-access";

export default async function SettingsPage() {
  const session = await requirePageAccess("/settings");

  const fullName =
    session.fullName?.trim() ||
    session.email.split("@")[0] ||
    "Usuario";

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
