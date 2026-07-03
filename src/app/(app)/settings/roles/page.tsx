import { RolesPermissionsView } from "@/components/settings/roles-permissions-view";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { fetchChurchAuthUsers } from "@/lib/services/admin-users";
import {
  fetchAppPermissions,
  fetchChurchRolesWithPermissions,
} from "@/lib/services/roles";
import { createClient } from "@/lib/supabase/server";

function countUsersByRole(
  users: Awaited<ReturnType<typeof fetchChurchAuthUsers>>,
): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const user of users) {
    if (user.appRoleId == null) continue;
    counts[user.appRoleId] = (counts[user.appRoleId] ?? 0) + 1;
  }
  return counts;
}

export default async function RolesSettingsPage() {
  const session = await requirePageAccess("/settings/roles");
  const canManage = hasPermission(session, "roles:manage");

  const supabase = await createClient();
  let error: string | null = null;
  let roles: Awaited<ReturnType<typeof fetchChurchRolesWithPermissions>> = [];
  let catalog: Awaited<ReturnType<typeof fetchAppPermissions>> = [];

  try {
    let userCounts: Record<number, number> = {};
    if (hasPermission(session, "admin_users:manage")) {
      const users = await fetchChurchAuthUsers(supabase, session.churchId);
      userCounts = countUsersByRole(users);
    }

    [roles, catalog] = await Promise.all([
      fetchChurchRolesWithPermissions(supabase, session.churchId, userCounts),
      fetchAppPermissions(supabase),
    ]);
  } catch (e) {
    error =
      e instanceof Error ? e.message : "No se pudieron cargar los roles.";
  }

  if (error) {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
      >
        {error}
      </p>
    );
  }

  return (
    <RolesPermissionsView
      roles={roles}
      catalog={catalog}
      canManage={canManage}
      churchName={session.churchName}
    />
  );
}
