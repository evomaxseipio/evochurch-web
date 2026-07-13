import { redirect } from "next/navigation";

export default function BackofficeHomePage() {
  redirect("/apps/backoffice/sales");
}
