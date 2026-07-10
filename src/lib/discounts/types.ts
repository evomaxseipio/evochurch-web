export const DISCOUNT_BASE_KINDS = [
  "tithe",
  "offering",
  "donation",
  "total_income",
] as const;

export type DiscountBaseKind = (typeof DISCOUNT_BASE_KINDS)[number];

export const REPORT_DISCOUNT_SECTION_KEYS = ["council_sends"] as const;

export type ReportDiscountSectionKey =
  (typeof REPORT_DISCOUNT_SECTION_KEYS)[number];

export type DiscountTemplateLine = {
  id: string;
  label: string;
  percent: number;
  sortOrder: number;
};

export type ReportDiscountLink = {
  id: string;
  reportId: string;
  sectionKey: string;
  isActive: boolean;
};

export type DiscountTemplate = {
  id: string;
  churchId: number;
  organizationId: number | null;
  name: string;
  description: string;
  baseKind: DiscountBaseKind;
  isActive: boolean;
  lines: DiscountTemplateLine[];
  reportLinks: ReportDiscountLink[];
};

export type DiscountTemplateLineInput = {
  label: string;
  percent: number;
  sortOrder?: number;
};

export type DiscountTemplateInput = {
  templateId?: string | null;
  name: string;
  description: string;
  baseKind: DiscountBaseKind;
  isActive: boolean;
  lines: DiscountTemplateLineInput[];
};

export type DiscountAllocationLine = {
  label: string;
  percent: number;
  amount: number;
  sortOrder?: number;
};

export type DiscountAllocation = {
  baseKind: DiscountBaseKind;
  baseAmount: number;
  dateFrom: string;
  dateTo: string;
  lines: DiscountAllocationLine[];
};

export type TitheContributionRow = {
  incomeId: string;
  paymentDate: string;
  amount: number;
  fundId: string | null;
  fundName: string;
  memberName: string;
  receiptNumber: string;
};

export type DiscountPeriodRunStatus = "open" | "closed";

export type DiscountPeriodRun = {
  id: string | null;
  churchId: number;
  templateId: string;
  periodStart: string;
  periodEnd: string;
  status: DiscountPeriodRunStatus;
  baseAmount: number;
  allocation: DiscountAllocationLine[];
  contributions: TitheContributionRow[];
  closedAt: string | null;
  closedBy: string | null;
  notes: string;
};

export type DiscountPeriodRunSummary = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: DiscountPeriodRunStatus;
  baseAmount: number;
  closedAt: string | null;
};
