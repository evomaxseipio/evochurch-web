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
  const loadErrors: string[] = [];
  let members: Awaited<ReturnType<typeof fetchMembersPage>>["members"] = [];
  let ministries: Awaited<ReturnType<typeof fetchMinistries>> = [];
  let funds: Awaited<ReturnType<typeof fetchFunds>> = [];

  try {
    const membersResult = await fetchMembersPage(supabase, {
      churchId: session.churchId,
      page: 1,
      pageSize: null,
      filter: "all",
    });
    members = membersResult.members;
  } catch (e) {
    loadErrors.push(
      e instanceof Error ? e.message : tErrors("loadFailed"),
    );
  }

  try {
    ministries = await fetchMinistries(supabase, session.churchId);
  } catch (e) {
    loadErrors.push(
      e instanceof Error ? e.message : tErrors("loadFailed"),
    );
  }

  try {
    funds = await fetchFunds(supabase, session.churchId);
  } catch (e) {
    loadErrors.push(
      e instanceof Error ? e.message : tErrors("loadFailed"),
    );
  }

  if (ministries.length === 0 && loadErrors.length > 0) {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{
          background: "var(--danger-bg)",
          color: "var(--danger)",
        }}
      >
        {loadErrors.join(" · ")}
      </p>
    );
  }

  return (
    <>
      {loadErrors.length > 0 ? (
        <p
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            marginBottom: 16,
            background: "var(--danger-bg)",
            color: "var(--danger)",
          }}
        >
          {loadErrors.join(" · ")}
        </p>
      ) : null}
      <MinistriesListView
        ministries={ministries}
        stats={computeMinistryStats(ministries)}
        members={members}
        funds={funds}
        permissions={session.permissions}
        profileId={session.profileId}
      />
    </>
  );
}
