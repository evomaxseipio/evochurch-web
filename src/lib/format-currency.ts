import type { Locale } from "@/i18n/config";
import { formatCurrency, formatNumber } from "@/lib/i18n/format";

function trimCurrencyDecimals(value: string): string {
  return value
    .replace(/([.,]00)(?!\d)/, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

export function fmtRD(n: number, locale: Locale = "es"): string {
  return trimCurrencyDecimals(formatCurrency(Math.abs(n), locale, "DOP"));
}

export function fmtRDshort(n: number, locale: Locale = "es"): string {
  const abs = Math.abs(n);
  const suffix = abs >= 1_000_000 ? "M" : abs >= 1_000 ? "K" : "";
  const value =
    abs >= 1_000_000
      ? n / 1_000_000
      : abs >= 1_000
        ? n / 1_000
        : n;
  const rounded = abs >= 1_000 ? Number(value.toFixed(1)) : Math.round(value);
  const formatted = formatNumber(rounded, locale, {
    minimumFractionDigits: abs >= 1_000 ? 1 : 0,
    maximumFractionDigits: abs >= 1_000 ? 1 : 0,
  });
  return `RD$ ${formatted}${suffix}`.trim();
}
