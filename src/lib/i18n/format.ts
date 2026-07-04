import type { Locale } from "@/i18n/config";

const LOCALE_TO_BCP47: Record<Locale, string> = {
  es: "es-DO",
  en: "en-US",
  fr: "fr-FR",
};

/** Default currency when church currency is unknown — DOP for RD product. */
export const DEFAULT_CURRENCY = "DOP";

export function formatDate(
  value: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(LOCALE_TO_BCP47[locale], options);
}

export function formatDateTime(
  value: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(LOCALE_TO_BCP47[locale], options);
}

export function formatCurrency(
  value: number,
  locale: Locale,
  currency: string = DEFAULT_CURRENCY,
): string {
  return value.toLocaleString(LOCALE_TO_BCP47[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(LOCALE_TO_BCP47[locale], options);
}

export function localeCompare(
  a: string,
  b: string,
  locale: Locale,
): number {
  return a.localeCompare(b, LOCALE_TO_BCP47[locale], { sensitivity: "base" });
}
