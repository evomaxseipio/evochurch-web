"use server";

import { getActionSessionWith } from "@/lib/auth/permissions";
import type { FundInput } from "@/lib/funds/types";
import {
  deleteFund,
  saveFund,
  setPrimaryFund,
} from "@/lib/services/funds";
import { revalidateFundsCatalog } from "@/lib/cache/catalog-tags";
import { revalidatePath } from "next/cache";

export type FundActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function writeSessionContext() {
  const { supabase, session } = await getActionSessionWith("finances:funds:write");
  return { supabase, churchId: session.churchId };
}

async function deleteSessionContext() {
  const { supabase, session } = await getActionSessionWith("finances:funds:delete");
  return { supabase, churchId: session.churchId };
}

function parseFundInput(formData: FormData): FundInput {
  const fundId = String(formData.get("fundId") ?? "").trim();
  const targetRaw = String(formData.get("targetAmount") ?? "").trim();
  const balanceRaw = String(formData.get("totalContributions") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();

  return {
    fundId: fundId || null,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    targetAmount: Number.parseFloat(targetRaw) || 0,
    totalContributions: Number.parseFloat(balanceRaw) || 0,
    startDate: String(formData.get("startDate") ?? "").trim(),
    endDate: endDate || null,
    isActive: formData.get("isActive") === "true",
    isPrimary: formData.get("isPrimary") === "true",
  };
}

function validateFundInput(input: FundInput): string | null {
  if (!input.name) return "El nombre del fondo es obligatorio.";
  if (!input.startDate) return "La fecha de inicio es obligatoria.";
  if (!input.targetAmount || input.targetAmount <= 0) {
    return "La meta debe ser mayor que cero.";
  }
  return null;
}

export async function saveFundAction(
  _prev: FundActionResult | null,
  formData: FormData,
): Promise<FundActionResult> {
  try {
    const input = parseFundInput(formData);
    const validationError = validateFundInput(input);
    if (validationError) return { ok: false, error: validationError };

    const { supabase, churchId } = await writeSessionContext();
    await saveFund(supabase, churchId, input);
    revalidateFundsCatalog(churchId);
    revalidatePath("/finances/funds");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo guardar el fondo.",
    };
  }
}

export async function deleteFundAction(
  _prev: FundActionResult | null,
  formData: FormData,
): Promise<FundActionResult> {
  try {
    const fundId = String(formData.get("fundId") ?? "").trim();
    if (!fundId) return { ok: false, error: "Fondo no válido." };

    const { supabase, churchId } = await deleteSessionContext();
    await deleteFund(supabase, churchId, fundId);
    revalidateFundsCatalog(churchId);
    revalidatePath("/finances/funds");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo eliminar el fondo.",
    };
  }
}

export async function setPrimaryFundAction(
  _prev: FundActionResult | null,
  formData: FormData,
): Promise<FundActionResult> {
  try {
    const fundId = String(formData.get("fundId") ?? "").trim();
    if (!fundId) return { ok: false, error: "Fondo no válido." };

    const { supabase, churchId } = await writeSessionContext();
    await setPrimaryFund(supabase, churchId, fundId);
    revalidateFundsCatalog(churchId);
    revalidatePath("/finances/funds");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "No se pudo marcar el fondo como primario.",
    };
  }
}
