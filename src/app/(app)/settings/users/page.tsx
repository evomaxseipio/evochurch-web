import { AdminUsersListView } from "@/components/admin-users/admin-users-list-view";
import { getAppSession } from "@/lib/auth/app-session";
import { getAdminSessionOrNull } from "@/lib/auth/require-admin-session";
import { fetchChurchAuthUsers } from "@/lib/services/admin-users";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function UsersSettingsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");

  const adminSession = await getAdminSessionOrNull();
  if (!adminSession) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div className="eyebrow">Configuración · Acceso</div>
        <h1 className="display" style={{ fontSize: 28, margin: "8px 0 12px" }}>
          Usuarios del sistema
        </h1>
        <p className="muted" style={{ margin: 0, maxWidth: 560 }}>
          Solo un <strong>Administrador</strong> puede gestionar cuentas de
          acceso. Tu rol actual es{" "}
          {session.appRoleName ?? session.membershipRole ?? "sin rol asignado"}.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  let error: string | null = null;
  let users: Awaited<ReturnType<typeof fetchChurchAuthUsers>> = [];

  try {
    users = await fetchChurchAuthUsers(supabase, adminSession.churchId);
  } catch (e) {
    error =
      e instanceof Error ? e.message : "No se pudieron cargar los usuarios.";
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

  return <AdminUsersListView users={users} />;
}
