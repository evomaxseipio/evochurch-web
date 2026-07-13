import { OrgBrandProvider } from "@/components/org/org-brand-provider";
import { OrgShell } from "@/components/org/org-shell";
import { orgPath } from "@/lib/apps/org-routes";
import { getOrgSession } from "@/lib/auth/org-session";
import { resolveOrgShellNav } from "@/lib/org/resolve-org-shell-nav";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

const ORG_ROLE_KEYS = [
  "council_admin",
  "district_auditor",
  "org_viewer",
] as const;

type OrgRoleKey = (typeof ORG_ROLE_KEYS)[number];

function isOrgRoleKey(value: string): value is OrgRoleKey {
  return (ORG_ROLE_KEYS as readonly string[]).includes(value);
}

function organizationShortName(name: string, slug?: string | null): string {
  if (slug === "adg-rd") return "ADG República Dominicana";
  if (name.length <= 42) return name;
  const comma = name.indexOf(",");
  if (comma > 0 && comma <= 48) return name.slice(0, comma).trim();
  return `${name.slice(0, 39).trim()}…`;
}

export default async function OrgConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOrgSession();
  if (!session) {
    redirect(orgPath("login"));
  }

  const [tRoles, shellNav] = await Promise.all([
    getTranslations("org.nav.roles"),
    resolveOrgShellNav(session.permissions),
  ]);

  const userLabel =
    session.fullName ?? session.email.split("@")[0] ?? "Usuario";
  const userRole = isOrgRoleKey(session.orgRoleKey)
    ? tRoles(session.orgRoleKey)
    : session.orgRoleKey;

  return (
    <OrgBrandProvider branding={session.orgBranding}>
      <OrgShell
        organizationName={session.organizationName}
        organizationShort={organizationShortName(
          session.organizationName,
          session.orgBranding?.slug,
        )}
        logoUrl={session.orgBranding?.logoUrl}
        userLabel={userLabel}
        userEmail={session.email}
        userRole={userRole}
        labels={shellNav.labels}
        mainNav={shellNav.mainNav}
        adminNav={shellNav.adminNav}
      >
        {children}
      </OrgShell>
    </OrgBrandProvider>
  );
}
