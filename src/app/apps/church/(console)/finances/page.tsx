import { churchPath } from "@/lib/apps/church-routes";
import { redirect } from "next/navigation";

export default function FinancesIndexPage() {
  redirect(churchPath("/finances/funds"));
}
