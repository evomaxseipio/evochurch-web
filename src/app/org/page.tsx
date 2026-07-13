import { orgPath } from "@/lib/apps/org-routes";
import { redirect } from "next/navigation";

export default function OrgHomePage() {
  redirect(orgPath("dashboard"));
}
