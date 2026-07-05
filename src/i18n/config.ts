/**
 * Supported locales: es (default), en, fr.
 * No URL prefix — locale resolved via BD → cookie → Accept-Language.
 */
export const locales = ["es", "en", "fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export const localeLabels: Record<
  Locale,
  { label: string; flag: string; code: string }
> = {
  es: { label: "Español", flag: "🇩🇴", code: "ES" },
  en: { label: "English", flag: "🇺🇸", code: "EN" },
  fr: { label: "Français", flag: "🇫🇷", code: "FR" },
};

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function resolveLocaleFromAcceptLanguage(
  header: string | null,
): Locale | null {
  if (!header) return null;
  const parts = header.split(",").map((p) => p.trim().split(";")[0]?.toLowerCase());
  for (const part of parts) {
    if (!part) continue;
    const base = part.split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}
