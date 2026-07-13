import { AttendanceChecklistView } from "@/components/attendance/attendance-checklist-view";
import { churchPath } from "@/lib/apps/church-routes";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { fetchAttendanceSession } from "@/lib/services/attendance";
import { fetchMembersPage } from "@/lib/services/members";
import { fetchMinistries } from "@/lib/services/ministries";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

export default async function AttendanceSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePageAccess("/attendance");
  const tErrors = await getTranslations("errors");
  const { id } = await params;
  if (!id?.trim()) redirect(churchPath("/attendance"));

  const supabase = await createClient();
  let error: string | null = null;
  let detail: Awaited<ReturnType<typeof fetchAttendanceSession>> | null = null;
  let members: Awaited<ReturnType<typeof fetchMembersPage>>["members"] = [];
  let ministries: Awaited<ReturnType<typeof fetchMinistries>> = [];

  try {
    const [sessionDetail, membersResult, ministryRows] = await Promise.all([
      fetchAttendanceSession(supabase, session.churchId, id),
      fetchMembersPage(supabase, {
        churchId: session.churchId,
        page: 1,
        pageSize: null,
        filter: "all",
      }),
      fetchMinistries(supabase, session.churchId),
    ]);
    detail = sessionDetail;
    members = membersResult.members;
    ministries = ministryRows;
  } catch (e) {
    const message = e instanceof Error ? e.message.toLowerCase() : "";
    if (message.includes("404") || message.includes("no encontrada")) {
      notFound();
    }
    error = e instanceof Error ? e.message : tErrors("loadFailed");
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

  if (!detail) notFound();

  return (
    <AttendanceChecklistView
      session={detail.session}
      records={detail.records}
      members={members}
      ministries={ministries}
      canWrite={hasPermission(session, "attendance:write")}
    />
  );
}
