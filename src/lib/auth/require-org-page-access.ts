import {
  getOrgSession,
  orgHasPermission,
  type OrgSession,
} from "@/lib/auth/org-session";
import { orgPermissionForPath } from "@/lib/auth/org-route-permissions";
import { redirect } from "next/navigation";

export async function requireOrgPageAccess(pathname: string): Promise<OrgSession> {
  const session = await getOrgSession();
  if (!session) {
    redirect("/org/login");
  }

  const required = orgPermissionForPath(pathname);
  if (required && !orgHasPermission(session, required)) {
    redirect("/org/dashboard");
  }

  return session;
}
