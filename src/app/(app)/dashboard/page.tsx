import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getAppSession } from "@/lib/auth/app-session";

export default async function DashboardPage() {
  const session = await getAppSession();

  const pastorName = session?.fullName?.split(" ")[0] ?? undefined;
  const churchName = session?.churchName ?? null;

  return <DashboardView pastorName={pastorName} churchName={churchName} />;
}
