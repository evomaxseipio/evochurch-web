import {
  parseDiscountAllocation,
  parseDiscountTemplatesResponse,
} from "@/lib/discounts/parse";
import type {
  DiscountAllocation,
  DiscountTemplate,
  DiscountTemplateInput,
  ReportDiscountSectionKey,
} from "@/lib/discounts/types";
import type { ReportId } from "@/lib/reports/types";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";

function rpcMessage(raw: unknown): string {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  return typeof row?.message === "string"
    ? row.message
    : "Error al procesar plantilla de descuento.";
}

export async function fetchDiscountTemplates(
  supabase: SupabaseClient,
  churchId: number,
): Promise<DiscountTemplate[]> {
  const { data, error } = await supabase.rpc("sp_list_discount_templates", {
    p_church_id: churchId,
  });
  if (error) throw error;
  return parseDiscountTemplatesResponse(data);
}

export async function saveDiscountTemplate(
  supabase: SupabaseClient,
  churchId: number,
  input: DiscountTemplateInput,
): Promise<string> {
  const lines = input.lines.map((line, index) => ({
    label: line.label.trim(),
    percent: line.percent,
    sortOrder: line.sortOrder ?? index + 1,
  }));

  const { data, error } = await supabase.rpc("sp_maintain_discount_template", {
    p_church_id: churchId,
    p_template_id: input.templateId ?? null,
    p_name: input.name.trim(),
    p_description: input.description.trim() || null,
    p_base_kind: input.baseKind,
    p_is_active: input.isActive,
    p_lines: lines,
  });
  if (error) throw error;
  assertRpcSuccess(data, rpcMessage(data));

  const row =
    data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const id = row?.template_id ?? row?.templateId;
  if (typeof id !== "string" || !id) {
    throw new Error("No se recibió el id de la plantilla.");
  }
  return id;
}

export async function deleteDiscountTemplate(
  supabase: SupabaseClient,
  churchId: number,
  templateId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_delete_discount_template", {
    p_church_id: churchId,
    p_template_id: templateId,
  });
  if (error) throw error;
  assertRpcSuccess(data, rpcMessage(data));
}

export async function setTemplateReportLink(
  supabase: SupabaseClient,
  churchId: number,
  params: {
    templateId: string;
    reportId: ReportId | null;
    sectionKey?: ReportDiscountSectionKey;
  },
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_set_template_report_link", {
    p_church_id: churchId,
    p_template_id: params.templateId,
    p_report_id: params.reportId,
    p_section_key: params.sectionKey ?? "council_sends",
  });
  if (error) throw error;
  assertRpcSuccess(data, rpcMessage(data));
}

export async function saveReportDiscountLink(
  supabase: SupabaseClient,
  churchId: number,
  params: {
    reportId: ReportId;
    templateId: string;
    sectionKey?: ReportDiscountSectionKey;
    isActive?: boolean;
  },
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_maintain_report_discount_link", {
    p_church_id: churchId,
    p_report_id: params.reportId,
    p_template_id: params.templateId,
    p_section_key: params.sectionKey ?? "council_sends",
    p_is_active: params.isActive ?? true,
    p_delete: false,
  });
  if (error) throw error;
  assertRpcSuccess(data, rpcMessage(data));
}

export async function deleteReportDiscountLink(
  supabase: SupabaseClient,
  churchId: number,
  params: {
    reportId: ReportId;
    sectionKey?: ReportDiscountSectionKey;
  },
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_maintain_report_discount_link", {
    p_church_id: churchId,
    p_report_id: params.reportId,
    p_template_id: null,
    p_section_key: params.sectionKey ?? "council_sends",
    p_is_active: false,
    p_delete: true,
  });
  if (error) throw error;
  assertRpcSuccess(data, rpcMessage(data));
}

export async function fetchLinkedTemplateIdForReport(
  supabase: SupabaseClient,
  churchId: number,
  reportId: ReportId,
  sectionKey: ReportDiscountSectionKey = "council_sends",
): Promise<string | null> {
  const { data, error } = await supabase.rpc("sp_get_report_discount_link", {
    p_church_id: churchId,
    p_report_id: reportId,
    p_section_key: sectionKey,
  });
  if (error) throw error;

  const row =
    data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  if (!row?.success || row.linked !== true) return null;

  const id = row.template_id ?? row.templateId;
  return typeof id === "string" && id ? id : null;
}

export async function computeDiscountAllocation(
  supabase: SupabaseClient,
  churchId: number,
  templateId: string,
  dateFrom: string,
  dateTo: string,
): Promise<DiscountAllocation | null> {
  const { data, error } = await supabase.rpc("sp_compute_discount_allocation", {
    p_church_id: churchId,
    p_template_id: templateId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });
  if (error) throw error;
  return parseDiscountAllocation(data);
}
