import { PlaceholderPage } from "@/components/ui/placeholder-page";
import { requirePageAccess } from "@/lib/auth/require-page-access";

export default async function ComunicacionPage() {
  await requirePageAccess("/comunicacion");

  return (
    <PlaceholderPage
      title="Comunicación"
      subtitle="Chat interno, anuncios y notificaciones"
    />
  );
}
