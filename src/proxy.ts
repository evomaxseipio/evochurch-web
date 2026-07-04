import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Auth/session proxy only. Locale is resolved in src/i18n/request.ts (cookie + BD)
 * without URL prefix — do NOT use next-intl middleware here; it rewrites to /es/...
 * and 404s because we have no [locale] segment in the App Router tree.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
