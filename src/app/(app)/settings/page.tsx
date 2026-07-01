import { SettingsView } from "@/components/settings/settings-view";
import {
  getAppSession,
  getSessionDisplayRole,
} from "@/lib/auth/app-session";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

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
