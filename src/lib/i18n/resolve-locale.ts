import { getAppSession } from "@/lib/auth/app-session";
import { isLocale, type Locale } from "@/i18n/config";

/** BD preferred_locale when authenticated; null for anonymous. */
export async function getPreferredLocaleFromSession(): Promise<Locale | null> {
  const session = await getAppSession();
  if (!session?.preferredLocale) return null;
  return isLocale(session.preferredLocale) ? session.preferredLocale : null;
}
