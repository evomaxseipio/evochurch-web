import { AttendanceListView } from "@/components/attendance/attendance-list-view";
import {
  isAttendanceActivityType,
  type AttendanceActivityType,
} from "@/lib/attendance/types";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { fetchAttendanceSessions } from "@/lib/services/attendance";
import { fetchMinistries } from "@/lib/services/ministries";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await requirePageAccess("/attendance");
  const tErrors = await getTranslations("errors");
  const locale = await getLocale();
  const { type: typeRaw } = await searchParams;
  const activityFilter: AttendanceActivityType | "all" =
    typeRaw && isAttendanceActivityType(typeRaw) ? typeRaw : "all";

  const supabase = await createClient();
  let error: string | null = null;
  let sessions: Awaited<
    ReturnType<typeof fetchAttendanceSessions>
  >["sessions"] = [];
  let ministries: Awaited<ReturnType<typeof fetchMinistries>> = [];

  try {
    const [list, ministryRows] = await Promise.all([
      fetchAttendanceSessions(supabase, {
        churchId: session.churchId,
        activityType: activityFilter === "all" ? null : activityFilter,
        limit: 100,
      }),
      fetchMinistries(supabase, session.churchId),
    ]);
    sessions = list.sessions;
    ministries = ministryRows;
  } catch (e) {
    error = e instanceof Error ? e.message : tErrors("loadFailed");
  }

  return (
    <>
      {error ? (
        <p
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: "var(--danger-bg)",
            color: "var(--danger)",
          }}
        >
          {error}
        </p>
      ) : (
        <AttendanceListView
          sessions={sessions}
          ministries={ministries}
          activityFilter={activityFilter}
          canWrite={hasPermission(session, "attendance:write")}
          locale={locale}
        />
      )}
    </>
  );
}
