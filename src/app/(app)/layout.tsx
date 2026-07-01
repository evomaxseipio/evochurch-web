import { AppShell } from "@/components/shell/app-shell";
import {
  getAppSession,
  getSessionDisplayRole,
} from "@/lib/auth/app-session";
import { getVerifiedUser } from "@/lib/supabase/session";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getVerifiedUser();

  if (!user) {
    redirect("/login");
  }

  const session = await getAppSession();
  const userLabel =
    session?.fullName ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Usuario";

  return (
    <AppShell
      churchName={session?.churchName ?? null}
      userLabel={userLabel}
      userEmail={session?.email ?? user.email}
      userRole={session ? getSessionDisplayRole(session) : undefined}
    >
      {!session ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          Tu cuenta de acceso existe, pero no está vinculada a un perfil de
          iglesia en EvoChurch. Contacta al administrador de tu congregación.
        </div>
      ) : null}
      {children}
    </AppShell>
  );
}
