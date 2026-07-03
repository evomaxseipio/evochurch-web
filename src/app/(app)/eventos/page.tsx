import { PlaceholderPage } from "@/components/ui/placeholder-page";
import { requirePageAccess } from "@/lib/auth/require-page-access";

export default async function EventosPage() {
  await requirePageAccess("/eventos");

  return (
    <PlaceholderPage
      title="Eventos"
      subtitle="Calendario y agenda de la congregación"
    />
  );
}
