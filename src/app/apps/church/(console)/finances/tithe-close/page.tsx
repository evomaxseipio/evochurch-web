import { churchPath } from "@/lib/apps/church-routes";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { redirect } from "next/navigation";

/** Legacy URL — el cierre semanal vive solo en Reportes. */
export default async function TitheCloseRedirectPage() {
  await requirePageAccess("/finances/tithe-close");
  redirect(`${churchPath("/reports")}?report=tithe-weekly-close&open=1`);
}
