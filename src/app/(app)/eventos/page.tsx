import { PlaceholderPage } from "@/components/ui/placeholder-page";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { getTranslations } from "next-intl/server";

export default async function EventosPage() {
  const t = await getTranslations("eventos");
  await requirePageAccess("/eventos");

  return <PlaceholderPage title={t("title")} subtitle={t("subtitle")} />;
}
