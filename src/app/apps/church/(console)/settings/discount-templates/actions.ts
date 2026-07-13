"use server";
import { churchPath } from "@/lib/apps/church-routes";

import { getActionSessionWith } from "@/lib/auth/permissions-server";
import {
  linePercentsValidForSave,
} from "@/lib/discounts/parse";
import type { DiscountBaseKind, DiscountTemplateLineInput } from "@/lib/discounts/types";
import { DISCOUNT_BASE_KINDS } from "@/lib/discounts/types";
import type { ReportId } from "@/lib/reports/types";
import {
  reportDiscountSectionKey,
  reportSupportsDiscountTemplates,
} from "@/lib/reports/catalog";
import {
  deleteDiscountTemplate,
  saveDiscountTemplate,
  setTemplateReportLink,
} from "@/lib/services/discount-templates";
import { fetchChurchReportDefinitions } from "@/lib/services/report-definitions";
import { revalidatePath } from "next/cache";

export type DiscountActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function writeContext() {
  const { supabase, session } = await getActionSessionWith(
    "settings:discount_templates:write",
  );
  const definitions = await fetchChurchReportDefinitions(
    supabase,
    session.churchId,
  );
  return { supabase, churchId: session.churchId, definitions };
}

function parseReportId(
  raw: string,
  definitions: Awaited<ReturnType<typeof fetchChurchReportDefinitions>>,
): ReportId | null {
  const id = raw.trim();
  if (!id) return null;
  if (!reportSupportsDiscountTemplates(id as ReportId, definitions)) return null;
  return id as ReportId;
}

function parseLinesJson(raw: string): DiscountTemplateLineInput[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const label = String(row.label ?? "").trim();
        const percent = Number(row.percent);
        if (!label || !Number.isFinite(percent)) return null;
        return { label, percent };
      })
      .filter((l): l is DiscountTemplateLineInput => l != null);
  } catch {
    return [];
  }
}

function validateTemplateInput(
  name: string,
  baseKind: string,
  lines: DiscountTemplateLineInput[],
): string | null {
  if (!name.trim()) return "El nombre es obligatorio.";
  if (!(DISCOUNT_BASE_KINDS as readonly string[]).includes(baseKind)) {
    return "Base de cálculo inválida.";
  }
  if (!linePercentsValidForSave(lines)) {
    if (lines.length === 0) return "Agrega al menos una partida.";
    return "Los porcentajes no pueden superar 100%.";
  }
  return null;
}

export async function saveDiscountTemplateAction(
  _prev: DiscountActionResult | null,
  formData: FormData,
): Promise<DiscountActionResult> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const baseKind = String(formData.get("baseKind") ?? "tithe");
    const isActive = formData.get("isActive") === "true";
    const templateId = String(formData.get("templateId") ?? "").trim() || null;

    const { supabase, churchId, definitions } = await writeContext();
    const reportId = parseReportId(
      String(formData.get("reportId") ?? ""),
      definitions,
    );
    const lines = parseLinesJson(String(formData.get("lines") ?? "[]"));

    const validationError = validateTemplateInput(name, baseKind, lines);
    if (validationError) return { ok: false, error: validationError };

    const savedId = await saveDiscountTemplate(supabase, churchId, {
      templateId,
      name,
      description,
      baseKind: baseKind as DiscountBaseKind,
      isActive,
      lines,
    });

    await setTemplateReportLink(supabase, churchId, {
      templateId: savedId,
      reportId,
      sectionKey: reportId
        ? reportDiscountSectionKey(reportId, definitions)
        : "council_sends",
    });

    revalidatePath(churchPath("/settings/discount-templates"));
    revalidatePath(churchPath("/reports"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo guardar la plantilla.",
    };
  }
}

export async function deleteDiscountTemplateAction(
  _prev: DiscountActionResult | null,
  formData: FormData,
): Promise<DiscountActionResult> {
  try {
    const templateId = String(formData.get("templateId") ?? "").trim();
    if (!templateId) return { ok: false, error: "Plantilla no válida." };

    const { supabase, churchId } = await writeContext();
    await deleteDiscountTemplate(supabase, churchId, templateId);
    revalidatePath(churchPath("/settings/discount-templates"));
    revalidatePath(churchPath("/reports"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo eliminar la plantilla.",
    };
  }
}

export async function setTemplateReportLinkAction(
  _prev: DiscountActionResult | null,
  formData: FormData,
): Promise<DiscountActionResult> {
  try {
    const templateId = String(formData.get("templateId") ?? "").trim();
    const { supabase, churchId, definitions } = await writeContext();
    const reportId = parseReportId(
      String(formData.get("reportId") ?? ""),
      definitions,
    );
    if (!templateId) {
      return { ok: false, error: "Plantilla no válida." };
    }

    await setTemplateReportLink(supabase, churchId, {
      templateId,
      reportId,
      sectionKey: reportId
        ? reportDiscountSectionKey(reportId, definitions)
        : "council_sends",
    });

    revalidatePath(churchPath("/settings/discount-templates"));
    revalidatePath(churchPath("/reports"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo vincular el reporte.",
    };
  }
}
