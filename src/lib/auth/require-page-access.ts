import {
  getAppSession,
  requireAppSession,
  type AppSession,
} from "@/lib/auth/app-session";
import {
  hasAnyPermission,
  hasPermission,
  isProfileOnlySession,
} from "@/lib/auth/permissions";
import type { PermissionKey } from "@/lib/auth/permission-keys";
import { permissionForPath } from "@/lib/auth/route-permissions";
import { redirect } from "next/navigation";

const DENIED_PATH = "/settings?denied=1";

export async function requirePageAccess(pathname: string): Promise<AppSession> {
  const session = await requireAppSession();

  if (isProfileOnlySession(session)) {
    const allowed =
      pathname === "/settings" ||
      pathname.startsWith("/settings/") ||
      (pathname.startsWith("/members/profile") &&
        hasPermission(session, "profile:read"));
    if (!allowed) redirect("/settings");
    return session;
  }

  const required = permissionForPath(pathname);
  if (required && !hasPermission(session, required)) {
    redirect(DENIED_PATH);
  }

  return session;
}

export async function getPageAccessOrNull(
  pathname: string,
): Promise<AppSession | null> {
  const session = await getAppSession();
  if (!session) return null;

  if (isProfileOnlySession(session)) {
    const allowed =
      pathname === "/settings" ||
      pathname.startsWith("/settings/") ||
      pathname.startsWith("/members/profile");
    return allowed ? session : null;
  }

  const required = permissionForPath(pathname);
  if (required && !hasPermission(session, required)) return null;
  return session;
}

export function requireAnyPermission(
  session: AppSession,
  keys: PermissionKey[],
): void {
  if (!hasAnyPermission(session, keys)) {
    throw new Error("Acceso denegado.");
  }
}
