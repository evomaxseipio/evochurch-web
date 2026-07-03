import { MinistriesListView } from "@/components/ministries/ministries-list-view";
import { computeMinistryStats } from "@/lib/ministries/parse";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { fetchMembersPage } from "@/lib/services/members";
import { fetchMinistries } from "@/lib/services/ministries";
import { createClient } from "@/lib/supabase/server";

export default async function MinisteriosPage() {
  const session = await requirePageAccess("/ministerios");

  const supabase = await createClient();
  let error: string | null = null;
  let members: Awaited<ReturnType<typeof fetchMembersPage>>["members"] = [];
  let ministries: Awaited<ReturnType<typeof fetchMinistries>> = [];

  try {
    const [membersResult, ministriesResult] = await Promise.all([
      fetchMembersPage(supabase, {
        churchId: session.churchId,
        page: 1,
        pageSize: null,
        filter: "all",
      }),
      fetchMinistries(supabase, session.churchId),
    ]);
    members = membersResult.members;
    ministries = ministriesResult;
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "No se pudieron cargar los ministerios.";
  }

  if (error) {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{
          background: "var(--danger-bg)",
          color: "var(--danger)",
        }}
      >
        {error}
      </p>
    );
  }

  return (
    <MinistriesListView
      ministries={ministries}
      stats={computeMinistryStats(ministries)}
      members={members}
      permissions={session.permissions}
      profileId={session.profileId}
    />
  );
}
