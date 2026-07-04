import { periodSlug } from "@/lib/reports/period";
import type { ReportFormat, ReportPeriod } from "@/lib/reports/types";
import type { Locale } from "@/i18n/config";

const UNSAFE_CHARS = /[^a-z0-9._-]+/gi;

export function slugifyReportBase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(UNSAFE_CHARS, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function reportDownloadFilename(
  baseSlug: string,
  format: ReportFormat,
  period?: ReportPeriod,
  options?: { locale?: Locale; includeLocaleSuffix?: boolean },
): string {
  const safeBase = slugifyReportBase(baseSlug) || "reporte";
  const periodSuffix = period ? `-${periodSlug(period)}` : "";
  const localeSuffix =
    options?.includeLocaleSuffix && options.locale ? `-${options.locale}` : "";
  const ext = format === "pdf" ? "pdf" : "xlsx";
  return `${safeBase}${periodSuffix}${localeSuffix}.${ext}`;
}

export function encodeReportBase64(data: Uint8Array): string {
  return Buffer.from(data).toString("base64");
}

export function decodeReportBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, "base64"));
}
