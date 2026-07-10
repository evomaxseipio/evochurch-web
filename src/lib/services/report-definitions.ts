import type { ReportDiscountSectionKey } from "@/lib/discounts/types";
import type { ReportCategory } from "@/lib/reports/catalog";
import type { ReportFormat, ReportId } from "@/lib/reports/types";
import { isReportId } from "@/lib/reports/types";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ChurchReportDefinition = {
  reportId: ReportId;
  category: ReportCategory;
  periodKind: "month" | "year" | "none";
  formats: ReportFormat[];
  permissionResource: string | null;
  /** Platform capability — report type can support discount templates. */
  platformSupportsDiscountTemplates: boolean;
  /** Church admin enabled templates for this report. */
  templateEnabled: boolean;
  /** Effective: platform ∧ church toggle. */
  supportsDiscountTemplates: boolean;
  discountSectionKey: ReportDiscountSectionKey;
  isActive: boolean;
  globalActive: boolean;
  churchOverrideActive: boolean | null;
  hasChurchOverride: boolean;
  sortOrder: number;
};

function rpcMessage(raw: unknown): string {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  return typeof row?.message === "string"
    ? row.message
    : "Error al cargar definiciones de reportes.";
}

function parseDefinitionRow(raw: unknown): ChurchReportDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const reportId = String(row.reportId ?? row.report_id ?? "").trim();
  if (!isReportId(reportId)) return null;

  const formatsRaw = row.formats;
  const formats = Array.isArray(formatsRaw)
    ? formatsRaw.filter((f): f is ReportFormat => f === "pdf" || f === "xlsx")
    : [];

  const category = String(row.category ?? "financial");
  const periodKind = String(row.periodKind ?? row.period_kind ?? "none");

  const platformSupports =
    row.platformSupportsDiscountTemplates === true ||
    row.platform_supports_discount_templates === true;

  const templateEnabled =
    row.templateEnabled === true || row.template_enabled === true;

  return {
    reportId,
    category: category as ReportCategory,
    periodKind:
      periodKind === "month" || periodKind === "year" ? periodKind : "none",
    formats,
    permissionResource:
      typeof row.permissionResource === "string"
        ? row.permissionResource
        : typeof row.permission_resource === "string"
          ? row.permission_resource
          : null,
    platformSupportsDiscountTemplates: platformSupports,
    templateEnabled,
    supportsDiscountTemplates: platformSupports && templateEnabled,
    discountSectionKey: (String(
      row.discountSectionKey ?? row.discount_section_key ?? "council_sends",
    ) || "council_sends") as ReportDiscountSectionKey,
    isActive: row.isActive !== false && row.is_active !== false,
    globalActive: row.globalActive !== false && row.global_active !== false,
    churchOverrideActive:
      row.hasChurchOverride === true || row.has_church_override === true
        ? row.churchOverrideActive !== false &&
          row.church_override_active !== false
        : null,
    hasChurchOverride:
      row.hasChurchOverride === true || row.has_church_override === true,
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0) || 0,
  };
}

export function parseChurchReportDefinitionsResponse(
  raw: unknown,
): ChurchReportDefinition[] {
  const envelope =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const list = envelope?.reports;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => parseDefinitionRow(item))
    .filter((item): item is ChurchReportDefinition => item != null);
}

export async function fetchChurchReportDefinitions(
  supabase: SupabaseClient,
  churchId: number,
): Promise<ChurchReportDefinition[]> {
  const { data, error } = await supabase.rpc("sp_list_church_report_definitions", {
    p_church_id: churchId,
  });
  if (error) throw error;
  assertRpcSuccess(data, rpcMessage(data));
  return parseChurchReportDefinitionsResponse(data);
}

export async function maintainChurchReportTemplateSetting(
  supabase: SupabaseClient,
  churchId: number,
  reportId: ReportId,
  templateEnabled: boolean,
): Promise<void> {
  const { data, error } = await supabase.rpc(
    "sp_maintain_church_report_template_setting",
    {
      p_church_id: churchId,
      p_report_id: reportId,
      p_template_enabled: templateEnabled,
    },
  );
  if (error) throw error;
  assertRpcSuccess(data, rpcMessage(data));
}

export async function maintainChurchReportSetting(
  supabase: SupabaseClient,
  churchId: number,
  reportId: ReportId,
  isActive: boolean,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_maintain_church_report_setting", {
    p_church_id: churchId,
    p_report_id: reportId,
    p_is_active: isActive,
  });
  if (error) throw error;
  assertRpcSuccess(data, rpcMessage(data));
}

export function reportDefinitionsById(
  definitions: ChurchReportDefinition[],
): Map<ReportId, ChurchReportDefinition> {
  return new Map(definitions.map((def) => [def.reportId, def]));
}
