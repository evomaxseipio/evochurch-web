import { MinistriesListView } from "@/components/ministries/ministries-list-view";
import { computeMinistryStats } from "@/lib/ministries/parse";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { fetchMembersPage } from "@/lib/services/members";
import { fetchMinistries } from "@/lib/services/ministries";
import { fetchFunds } from "@/lib/services/funds";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function MinisteriosPage() {
  const tErrors = await getTranslations("errors");
  const session = await requirePageAccess("/ministerios");

  const supabase = await createClient();
  let error: string | null = null;
  let members: Awaited<ReturnType<typeof fetchMembersPage>>["members"] = [];
  let ministries: Awaited<ReturnType<typeof fetchMinistries>> = [];
  let funds: Awaited<ReturnType<typeof fetchFunds>> = [];

  try {
    const [membersResult, ministriesResult, fundsResult] = await Promise.all([
      fetchMembersPage(supabase, {
        churchId: session.churchId,
        page: 1,
        pageSize: null,
        filter: "all",
      }),
      fetchMinistries(supabase, session.churchId),
      fetchFunds(supabase, session.churchId),
    ]);
    members = membersResult.members;
    ministries = ministriesResult;
    funds = fundsResult;
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : tErrors("loadFailed");
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
      funds={funds}
      permissions={session.permissions}
      profileId={session.profileId}
    />
  );
}
