import type { Locale } from "@/i18n/config";
import { formatCurrency, formatNumber } from "@/lib/i18n/format";

function trimCurrencyDecimals(value: string): string {
  return value
    .replace(/([.,]00)(?!\d)/, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

/** Full DOP amount with locale-aware grouping (e.g. RD$100,000). No space after RD$. */
export function fmtRD(n: number, locale: Locale = "es"): string {
  return trimCurrencyDecimals(formatCurrency(Math.abs(n), locale, "DOP"));
}

/** Prefix with minus when negative — use in KPI cards and tables that show signed amounts. */
export function fmtRDSigned(n: number, locale: Locale = "es"): string {
  return n < 0 ? `−${fmtRD(n, locale)}` : fmtRD(n, locale);
}

function fmtRDShortSuffix(
  value: number,
  locale: Locale,
  suffix: "K" | "M",
): string {
  const formatted = formatNumber(value, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  return `RD$ ${formatted}${suffix}`;
}

/** Compact chart axis / tooltip amounts (K/M suffix). Never use in KPI cards — use fmtRD. */
export function fmtRDshort(n: number, locale: Locale = "es"): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";

  if (abs >= 1_000_000) {
    return `${sign}${fmtRDShortSuffix(abs / 1_000_000, locale, "M")}`;
  }
  if (abs >= 1_000) {
    return `${sign}${fmtRDShortSuffix(abs / 1_000, locale, "K")}`;
  }
  return fmtRD(n, locale);
}

/** Chart tooltips and list rows — exact amount, no compact suffix. */
export function fmtRDChartTooltip(n: number, locale: Locale = "es"): string {
  return fmtRD(n, locale);
}
