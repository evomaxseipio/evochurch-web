import { NetworkView } from "@/components/network/network-view";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { fetchNetworkDashboard } from "@/lib/services/church-network";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function NetworkPage() {
  const t = await getTranslations("network");
  const tErrors = await getTranslations("errors");
  const session = await requirePageAccess("/network");

  if (session.churchKind !== "headquarters") {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
      >
        {t("notHeadquarters")}
      </p>
    );
  }

  const supabase = await createClient();
  let error: string | null = null;
  let dashboard: Awaited<ReturnType<typeof fetchNetworkDashboard>> | null =
    null;

  try {
    dashboard = await fetchNetworkDashboard(supabase, session.churchId);
  } catch (e) {
    error = e instanceof Error ? e.message : tErrors("loadFailed");
  }

  if (error || !dashboard) {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
      >
        {error ?? tErrors("loadFailed")}
      </p>
    );
  }

  return (
    <NetworkView
      churchName={session.churchName}
      dashboard={dashboard}
    />
  );
}
