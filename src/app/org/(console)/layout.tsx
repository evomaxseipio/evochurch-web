import { OrgBrandProvider } from "@/components/org/org-brand-provider";
import { OrgShell } from "@/components/org/org-shell";
import { getOrgSession } from "@/lib/auth/org-session";
import { redirect } from "next/navigation";

export default async function OrgConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOrgSession();
  if (!session) {
    redirect("/org/login");
  }

  const userLabel =
    session.fullName ?? session.email.split("@")[0] ?? "Usuario";

  return (
    <OrgBrandProvider branding={session.orgBranding}>
      <OrgShell
        organizationName={session.organizationName}
        userLabel={userLabel}
        permissions={session.permissions}
      >
        {children}
      </OrgShell>
    </OrgBrandProvider>
  );
}
