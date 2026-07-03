import { getActionSession, requireAppSession } from "@/lib/auth/app-session";
import type { PermissionKey } from "@/lib/auth/permission-keys";
import { requirePermission } from "@/lib/auth/permissions";

export async function getActionSessionWith(permission: PermissionKey) {
  const { supabase, session } = await getActionSession();
  requirePermission(session, permission);
  return { supabase, session };
}

export async function requirePermissionSession(key: PermissionKey) {
  const session = await requireAppSession();
  requirePermission(session, key);
  return session;
}
