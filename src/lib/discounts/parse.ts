import type {
  DiscountAllocation,
  DiscountBaseKind,
  DiscountPeriodRun,
  DiscountPeriodRunSummary,
  DiscountTemplate,
  DiscountTemplateLine,
  DiscountAllocationLine,
  ReportDiscountLink,
  TitheContributionRow,
} from "@/lib/discounts/types";
import { DISCOUNT_BASE_KINDS } from "@/lib/discounts/types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

export function parseDiscountBaseKind(value: unknown): DiscountBaseKind {
  const s = asString(value).toLowerCase();
  if ((DISCOUNT_BASE_KINDS as readonly string[]).includes(s)) {
    return s as DiscountBaseKind;
  }
  return "tithe";
}

function parseLine(raw: unknown): DiscountTemplateLine | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id ?? row.line_id);
  const label = asString(row.label).trim();
  if (!label) return null;
  return {
    id,
    label,
    percent: asNumber(row.percent),
    sortOrder: asNumber(row.sortOrder ?? row.sort_order),
  };
}

function parseReportLink(raw: unknown): ReportDiscountLink | null {
  const row = asRecord(raw);
  if (!row) return null;
  const reportId = asString(row.reportId ?? row.report_id).trim();
  if (!reportId) return null;
  return {
    id: asString(row.id),
    reportId,
    sectionKey: asString(row.sectionKey ?? row.section_key) || "council_sends",
    isActive: asBool(row.isActive ?? row.is_active, true),
  };
}

export function parseDiscountTemplate(raw: unknown): DiscountTemplate | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  if (!id) return null;

  const linesRaw = row.lines;
  const lines: DiscountTemplateLine[] = Array.isArray(linesRaw)
    ? linesRaw
        .map(parseLine)
        .filter((l): l is DiscountTemplateLine => l != null)
    : [];

  const linksRaw = row.reportLinks ?? row.report_links;
  const reportLinks: ReportDiscountLink[] = Array.isArray(linksRaw)
    ? linksRaw
        .map(parseReportLink)
        .filter((l): l is ReportDiscountLink => l != null)
    : [];

  return {
    id,
    churchId: asNumber(row.churchId ?? row.church_id),
    organizationId:
      row.organizationId == null && row.organization_id == null
        ? null
        : asNumber(row.organizationId ?? row.organization_id) || null,
    name: asString(row.name).trim(),
    description: asString(row.description).trim(),
    baseKind: parseDiscountBaseKind(row.baseKind ?? row.base_kind),
    isActive: asBool(row.isActive ?? row.is_active, true),
    lines,
    reportLinks,
  };
}

export function parseDiscountTemplatesResponse(data: unknown): DiscountTemplate[] {
  if (data == null) return [];

  const envelope = asRecord(data);
  if (!envelope || envelope.success === false) {
    const msg = asString(envelope?.message);
    throw new Error(msg || "Error al cargar plantillas de descuento.");
  }
  const templates = envelope.templates;
  if (!Array.isArray(templates)) return [];
  return templates
    .map(parseDiscountTemplate)
    .filter((t): t is DiscountTemplate => t != null);
}

export function parseDiscountAllocation(data: unknown): DiscountAllocation | null {
  const envelope = asRecord(data);
  if (!envelope || envelope.success !== true) return null;

  const linesRaw = envelope.lines;
  const lines = Array.isArray(linesRaw)
    ? linesRaw
        .map((raw) => {
          const row = asRecord(raw);
          if (!row) return null;
          return {
            label: asString(row.label).trim(),
            percent: asNumber(row.percent),
            amount: asNumber(row.amount),
            sortOrder: asNumber(row.sort_order ?? row.sortOrder),
          };
        })
        .filter((l): l is NonNullable<typeof l> => l != null && l.label !== "")
    : [];

  return {
    baseKind: parseDiscountBaseKind(envelope.baseKind ?? envelope.base_kind),
    baseAmount: asNumber(envelope.baseAmount ?? envelope.base_amount),
    dateFrom: asString(envelope.dateFrom ?? envelope.date_from),
    dateTo: asString(envelope.dateTo ?? envelope.date_to),
    lines,
  };
}

export function sumLinePercents(lines: { percent: number }[]): number {
  return lines.reduce((s, l) => s + l.percent, 0);
}

const PERCENT_SUM_TOLERANCE = 0.05;

export function linePercentsExceedMax(lines: { percent: number }[]): boolean {
  return sumLinePercents(lines) > 100 + PERCENT_SUM_TOLERANCE;
}

export function linePercentsValidForSave(lines: { percent: number }[]): boolean {
  if (lines.length === 0) return false;
  return !linePercentsExceedMax(lines);
}

function parseContributionRow(raw: unknown): TitheContributionRow | null {
  const row = asRecord(raw);
  if (!row) return null;
  return {
    incomeId: asString(row.incomeId ?? row.income_id),
    paymentDate: asString(row.paymentDate ?? row.payment_date),
    amount: asNumber(row.amount),
    fundId: row.fundId != null || row.fund_id != null
      ? asString(row.fundId ?? row.fund_id) || null
      : null,
    fundName: asString(row.fundName ?? row.fund_name),
    memberName: asString(row.memberName ?? row.member_name),
    receiptNumber: asString(row.receiptNumber ?? row.receipt_number),
  };
}

function parseAllocationLines(raw: unknown): DiscountAllocationLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const label = asString(row.label).trim();
      if (!label) return null;
      return {
        label,
        percent: asNumber(row.percent),
        amount: asNumber(row.amount),
        sortOrder: asNumber(row.sortOrder ?? row.sort_order),
      };
    })
    .filter((l): l is NonNullable<typeof l> => l != null);
}

export function parseDiscountPeriodRun(data: unknown): {
  run: DiscountPeriodRun | null;
  noTemplate: boolean;
} {
  const envelope = asRecord(data);
  if (!envelope || envelope.success === false) {
    throw new Error(asString(envelope?.message) || "Error al cargar cierre semanal.");
  }
  if (envelope.noTemplate === true) {
    return { run: null, noTemplate: true };
  }
  const row = asRecord(envelope.run);
  if (!row) return { run: null, noTemplate: false };

  const allocRaw = row.allocation;
  const contribRaw = row.contributions;

  return {
    run: {
      id: row.id != null ? asString(row.id) : null,
      churchId: asNumber(row.churchId ?? row.church_id),
      templateId: asString(row.templateId ?? row.template_id),
      periodStart: asString(row.periodStart ?? row.period_start),
      periodEnd: asString(row.periodEnd ?? row.period_end),
      status: asString(row.status) === "closed" ? "closed" : "open",
      baseAmount: asNumber(row.baseAmount ?? row.base_amount),
      allocation: parseAllocationLines(allocRaw),
      contributions: Array.isArray(contribRaw)
        ? contribRaw
            .map(parseContributionRow)
            .filter((c): c is TitheContributionRow => c != null)
        : [],
      closedAt: row.closedAt != null || row.closed_at != null
        ? asString(row.closedAt ?? row.closed_at)
        : null,
      closedBy: row.closedBy != null || row.closed_by != null
        ? asString(row.closedBy ?? row.closed_by)
        : null,
      notes: asString(row.notes),
    },
    noTemplate: false,
  };
}

export function parseDiscountPeriodRunSummaries(data: unknown): DiscountPeriodRunSummary[] {
  const envelope = asRecord(data);
  if (!envelope || envelope.success === false) return [];
  const runs = envelope.runs;
  if (!Array.isArray(runs)) return [];
  return runs
    .map((raw) => {
      const row = asRecord(raw);
      if (!row) return null;
      const id = asString(row.id);
      if (!id) return null;
      return {
        id,
        periodStart: asString(row.periodStart ?? row.period_start),
        periodEnd: asString(row.periodEnd ?? row.period_end),
        status: asString(row.status) === "closed" ? "closed" : "open",
        baseAmount: asNumber(row.baseAmount ?? row.base_amount),
        closedAt: row.closedAt != null ? asString(row.closedAt ?? row.closed_at) : null,
      } as DiscountPeriodRunSummary;
    })
    .filter((r): r is DiscountPeriodRunSummary => r != null);
}
