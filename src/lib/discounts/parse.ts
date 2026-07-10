import type {
  DiscountAllocation,
  DiscountBaseKind,
  DiscountTemplate,
  DiscountTemplateLine,
  ReportDiscountLink,
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
