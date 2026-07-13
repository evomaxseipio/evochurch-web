import { EventsView } from "@/components/events/events-view";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { fetchMinistries } from "@/lib/services/ministries";
import { fetchEvents } from "@/lib/services/events";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{ ministry?: string }>;
}) {
  await getTranslations("eventos");
  const session = await requirePageAccess("/eventos");
  const params = await searchParams;
  const ministryFilter = params.ministry?.trim() || null;

  const supabase = await createClient();
  const tErrors = await getTranslations("errors");

  let eventsPayload: Awaited<ReturnType<typeof fetchEvents>> = {
    timezone: "America/Santo_Domingo",
    events: [],
  };
  let ministries: Awaited<ReturnType<typeof fetchMinistries>> = [];
  const loadErrors: string[] = [];

  try {
    eventsPayload = await fetchEvents(supabase, session.churchId, {
      ministryId: ministryFilter,
    });
  } catch (e) {
    loadErrors.push(e instanceof Error ? e.message : tErrors("loadFailed"));
  }

  try {
    ministries = await fetchMinistries(supabase, session.churchId);
  } catch (e) {
    loadErrors.push(e instanceof Error ? e.message : tErrors("loadFailed"));
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
      <EventsView
        events={eventsPayload.events}
        timezone={eventsPayload.timezone}
        ministries={ministries}
        permissions={session.permissions}
        profileId={session.profileId}
      />
    </>
  );
}
