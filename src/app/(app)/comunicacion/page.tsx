import { PlaceholderPage } from "@/components/ui/placeholder-page";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { getTranslations } from "next-intl/server";

export default async function ComunicacionPage() {
  const t = await getTranslations("comunicacion");
  await requirePageAccess("/comunicacion");

  return <PlaceholderPage title={t("title")} subtitle={t("subtitle")} />;
}
