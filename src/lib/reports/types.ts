export const REPORT_IDS = [
  "financial-monthly-cead",
  "financial-monthly-concilio-f001",
  "membership-directory",
  "membership-annual-cead",
  "executive-monthly-summary",
  "financial-income-expense",
  "financial-by-fund",
  "financial-by-member",
] as const;

export type ReportId = (typeof REPORT_IDS)[number];

export type ReportFormat = "pdf" | "xlsx";

import type { MemberFilterKey } from "@/lib/members/types";

export type ReportExportOptions = {
  memberFilter?: MemberFilterKey;
};

export type ReportPeriod =
  | { kind: "month"; year: number; month: number }
  | { kind: "year"; year: number };

export type ReportMeta = {
  reportId: ReportId;
  format: ReportFormat;
  period?: ReportPeriod;
  generatedAt: string;
  churchId: number;
  churchName?: string;
};

export type GeneratedReportFile = {
  filename: string;
  mimeType: string;
  data: Uint8Array;
};

export interface ReportGenerator<TPayload> {
  buildPayload(): Promise<TPayload>;
  toPdf(payload: TPayload): Promise<Uint8Array>;
  toXlsx(payload: TPayload): Promise<Uint8Array>;
}

export function isReportId(value: string): value is ReportId {
  return (REPORT_IDS as readonly string[]).includes(value);
}

export function isReportFormat(value: string): value is ReportFormat {
  return value === "pdf" || value === "xlsx";
}

export const REPORT_MIME_TYPES: Record<ReportFormat, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
