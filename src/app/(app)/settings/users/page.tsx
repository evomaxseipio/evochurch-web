import { AdminUsersListView } from "@/components/admin-users/admin-users-list-view";
import { requireAppSession } from "@/lib/auth/app-session";
import { canManageAdminUsers } from "@/lib/auth/require-admin-session";
import {
  computeChurchAuthUsersStats,
  toAdminUserRow,
} from "@/lib/admin-users/parse";
import { fetchChurchAuthUsers } from "@/lib/services/admin-users";
import { fetchAssignableRoles } from "@/lib/services/roles";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function UsersSettingsPage() {
  const tAdmin = await getTranslations("adminUsers");
  const tErrors = await getTranslations("errors");
  const session = await requireAppSession();
  const adminSession = canManageAdminUsers(session) ? session : null;
  if (!adminSession) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div className="eyebrow">{tAdmin("settingsAccessEyebrow")}</div>
        <h1 className="display" style={{ fontSize: 28, margin: "8px 0 12px" }}>
          {tAdmin("title")}
        </h1>
        <p className="muted" style={{ margin: 0, maxWidth: 560 }}>
          {tAdmin("adminOnlyMessage", {
            role: session.appRoleName ?? session.membershipRole ?? tAdmin("noRoleAssigned"),
          })}
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  let error: string | null = null;
  let users: Awaited<ReturnType<typeof fetchChurchAuthUsers>> = [];
  let assignableRoles: Awaited<ReturnType<typeof fetchAssignableRoles>> = [];

  try {
    [users, assignableRoles] = await Promise.all([
      fetchChurchAuthUsers(supabase, adminSession.churchId),
      fetchAssignableRoles(supabase, adminSession.churchId),
    ]);
  } catch (e) {
    error =
      e instanceof Error ? e.message : tErrors("loadFailed");
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
    <AdminUsersListView
      rows={users.map(toAdminUserRow)}
      stats={computeChurchAuthUsersStats(users)}
      assignableRoles={assignableRoles}
    />
  );
}
