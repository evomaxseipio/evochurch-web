import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/shell/app-shell";
import { ChurchBrandProvider } from "@/components/brand/church-brand-provider";
import {
  getAppSession,
  getSessionDisplayRole,
} from "@/lib/auth/app-session";
import {
  sessionRequiresPasswordChange,
  UPDATE_PASSWORD_PATH,
} from "@/lib/auth/temp-password-flow";
import { resolveChurchLogoSignedUrl } from "@/lib/services/church-profile";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/session";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppSession();
  const tAuth = await getTranslations("auth");

  if (sessionRequiresPasswordChange(session)) {
    redirect(UPDATE_PASSWORD_PATH);
  }

  let churchLogoUrl: string | null = null;
  if (session?.churchBranding?.logoUrl) {
    const supabase = await createClient();
    churchLogoUrl = await resolveChurchLogoSignedUrl(
      supabase,
      session.churchBranding.logoUrl,
    );
  }

  if (!session) {
    const user = await getVerifiedUser();
    if (!user) {
      redirect("/login");
    }

    const userLabel =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Usuario";

    return (
      <ChurchBrandProvider>
        <AppShell
          churchName={null}
          userLabel={userLabel}
          userEmail={user.email}
        >
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            {tAuth("noChurchBanner")}
          </div>
          {children}
        </AppShell>
      </ChurchBrandProvider>
    );
  }

  const userLabel =
    session.fullName ?? session.email.split("@")[0] ?? "Usuario";

  return (
    <ChurchBrandProvider branding={session.churchBranding}>
      <AppShell
        churchName={session.churchName}
        churchShort={session.churchBranding?.shortName}
        churchLogoUrl={churchLogoUrl}
        churchKind={session.churchKind}
        userLabel={userLabel}
        userEmail={session.email}
        userRole={getSessionDisplayRole(session)}
        permissions={session.permissions}
      >
        {children}
      </AppShell>
    </ChurchBrandProvider>
  );
}
