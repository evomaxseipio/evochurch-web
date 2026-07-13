import { ChildDetailView } from "@/components/children/child-detail-view";
import { churchPath } from "@/lib/apps/church-routes";
import { fetchChildById } from "@/lib/services/children";
import { fetchMembersPage } from "@/lib/services/members";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { canWriteMembers } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requirePageAccess("/members/children");
  const tChildren = await getTranslations("children");
  const tErrors = await getTranslations("errors");
  const supabase = await createClient();

  let child = null;
  let adultMembers: Awaited<ReturnType<typeof fetchMembersPage>>["members"] = [];
  let error: string | null = null;

  try {
    const [childResult, membersResult] = await Promise.all([
      fetchChildById(supabase, session.churchId, id),
      fetchMembersPage(supabase, {
        churchId: session.churchId,
        page: 1,
        pageSize: null,
        filter: "all",
      }),
    ]);
    child = childResult;
    adultMembers = membersResult.members;
  } catch (e) {
    error = e instanceof Error ? e.message : tErrors("loadFailed");
  }

  if (error) {
    return (
      <div className="p-6">
        <p
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: "var(--danger-bg)",
            color: "var(--danger)",
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  if (!child) {
    notFound();
  }

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div style={{ marginBottom: 16 }}>
        <Link
          href={churchPath("/members/children")}
          className="tiny muted"
          style={{ textDecoration: "none" }}
        >
          ← {tChildren("backToList")}
        </Link>
      </div>
      <ChildDetailView
        child={child}
        adultMembers={adultMembers}
        canWrite={canWriteMembers(session)}
      />
    </div>
  );
}
