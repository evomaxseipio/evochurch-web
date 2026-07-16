import { churchPath } from "@/lib/apps/church-routes";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { redirect } from "next/navigation";

/** Deep link legacy: la checklist vive en drawer sobre el listado. */
export default async function AttendanceSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageAccess("/attendance");
  const { id } = await params;
  if (!id?.trim()) redirect(churchPath("/attendance"));
  redirect(
    `${churchPath("/attendance")}?checklist=${encodeURIComponent(id.trim())}`,
  );
}
