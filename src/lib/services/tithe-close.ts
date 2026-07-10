import {
  parseDiscountPeriodRun,
  parseDiscountPeriodRunSummaries,
} from "@/lib/discounts/parse";
import type { DiscountPeriodRun, DiscountPeriodRunSummary } from "@/lib/discounts/types";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import type { SupabaseClient } from "@supabase/supabase-js";

function rpcMessage(raw: unknown): string {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  return typeof row?.message === "string"
    ? row.message
    : "Error al procesar cierre de diezmos.";
}

export async function seedDefaultTitheTemplate(
  supabase: SupabaseClient,
  churchId: number,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("sp_seed_default_tithe_template", {
    p_church_id: churchId,
  });
  if (error) throw error;
  assertRpcSuccess(data, rpcMessage(data));
  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const id = row?.template_id ?? row?.templateId;
  return typeof id === "string" && id ? id : null;
}

export async function fetchDiscountPeriodRun(
  supabase: SupabaseClient,
  churchId: number,
  periodStart: string,
): Promise<{ run: DiscountPeriodRun | null; noTemplate: boolean }> {
  const { data, error } = await supabase.rpc("sp_get_discount_period_run", {
    p_church_id: churchId,
    p_period_start: periodStart,
  });
  if (error) throw error;
  return parseDiscountPeriodRun(data);
}

export async function fetchDiscountPeriodRunSummaries(
  supabase: SupabaseClient,
  churchId: number,
  year?: number,
): Promise<DiscountPeriodRunSummary[]> {
  const { data, error } = await supabase.rpc("sp_list_discount_period_runs", {
    p_church_id: churchId,
    p_year: year ?? null,
  });
  if (error) throw error;
  assertRpcSuccess(data, rpcMessage(data));
  return parseDiscountPeriodRunSummaries(data);
}

export async function closeDiscountPeriodRun(
  supabase: SupabaseClient,
  churchId: number,
  periodStart: string,
  notes?: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_close_discount_period_run", {
    p_church_id: churchId,
    p_period_start: periodStart,
    p_notes: notes?.trim() || null,
  });
  if (error) throw error;
  assertRpcSuccess(data, rpcMessage(data));
}

export type TitheClosePdfPayload = {
  churchName: string;
  periodStart: string;
  periodEnd: string;
  status: "open" | "closed";
  baseAmount: number;
  allocation: DiscountPeriodRun["allocation"];
  contributions: DiscountPeriodRun["contributions"];
  generatedAt: string;
  closedAt: string | null;
};
