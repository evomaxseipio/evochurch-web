"use server";

import { getActionSession } from "@/lib/auth/app-session";
import type { CatalogItemInput } from "@/lib/catalog/types";
import {
  deleteIncomeTypeCatalogItem,
  saveIncomeTypeCatalogItem,
} from "@/lib/services/income-types-catalog";
import { revalidatePath } from "next/cache";

export type CatalogActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function sessionContext() {
  const { supabase, session } = await getActionSession();
  return { supabase, churchId: session.churchId };
}

function parseCatalogInput(formData: FormData): CatalogItemInput {
  const idRaw = String(formData.get("id") ?? "").trim();
  const id = idRaw ? Number.parseInt(idRaw, 10) : null;

  return {
    id: id && Number.isFinite(id) ? id : null,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    isActive: formData.get("isActive") === "true",
  };
}

function validateCatalogInput(input: CatalogItemInput): string | null {
  if (!input.name) return "El nombre es obligatorio.";
  if (input.name.length > 120) {
    return "El nombre no puede superar 120 caracteres.";
  }
  if (input.description.length > 500) {
    return "La descripción no puede superar 500 caracteres.";
  }
  return null;
}

export async function saveIncomeTypeAction(
  _prev: CatalogActionResult | null,
  formData: FormData,
): Promise<CatalogActionResult> {
  try {
    const input = parseCatalogInput(formData);
    const validationError = validateCatalogInput(input);
    if (validationError) return { ok: false, error: validationError };

    const { supabase, churchId } = await sessionContext();
    await saveIncomeTypeCatalogItem(supabase, churchId, input);
    revalidatePath("/settings/income-types");
    revalidatePath("/finances/transactions");
    revalidatePath("/finances/contributions");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "No se pudo guardar el tipo de ingreso.",
    };
  }
}

export async function deleteIncomeTypeAction(
  _prev: CatalogActionResult | null,
  formData: FormData,
): Promise<CatalogActionResult> {
  try {
    const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
    if (!Number.isFinite(id)) return { ok: false, error: "Registro no válido." };

    const isLocked = formData.get("isLocked") === "true";
    if (isLocked) {
      return {
        ok: false,
        error: "Este tipo es del sistema y no se puede eliminar.",
      };
    }

    const { supabase, churchId } = await sessionContext();
    await deleteIncomeTypeCatalogItem(supabase, churchId, id);
    revalidatePath("/settings/income-types");
    revalidatePath("/finances/transactions");
    revalidatePath("/finances/contributions");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "No se pudo eliminar el tipo de ingreso.",
    };
  }
}
