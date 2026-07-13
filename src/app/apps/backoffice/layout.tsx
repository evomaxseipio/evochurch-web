import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/supabase/session";
import { BackofficeProviders } from "@/providers/backoffice-providers";
import { BackofficeShell } from "@/components/backoffice/backoffice-shell";

export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getVerifiedUser();
  if (!user) {
    redirect("/login");
  }

  const userLabel =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Usuario";

  return (
    <BackofficeProviders>
      <BackofficeShell userLabel={userLabel} userEmail={user.email ?? ""}>
        {children}
      </BackofficeShell>
    </BackofficeProviders>
  );
}
