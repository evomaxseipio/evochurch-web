"use server";

import { getActionSessionWith } from "@/lib/auth/permissions-server";
import type { CatalogItemInput } from "@/lib/catalog/types";
import {
  deleteExpenseType,
  saveExpenseType,
} from "@/lib/services/expense-types-catalog";
import { revalidateExpenseTypesCatalog } from "@/lib/cache/catalog-tags";
import { revalidatePath } from "next/cache";

export type CatalogActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function writeSessionContext() {
  const { supabase, session } = await getActionSessionWith(
    "settings:expense_types:write",
  );
  return { supabase, churchId: session.churchId };
}

async function deleteSessionContext() {
  const { supabase, session } = await getActionSessionWith(
    "settings:expense_types:delete",
  );
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

export async function saveExpenseTypeAction(
  _prev: CatalogActionResult | null,
  formData: FormData,
): Promise<CatalogActionResult> {
  try {
    const input = parseCatalogInput(formData);
    const validationError = validateCatalogInput(input);
    if (validationError) return { ok: false, error: validationError };

    const { supabase, churchId } = await writeSessionContext();
    await saveExpenseType(supabase, churchId, input);
    revalidateExpenseTypesCatalog(churchId);
    revalidatePath("/settings/expenses");
    revalidatePath("/finances/transactions");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo guardar el tipo de gasto.",
    };
  }
}

export async function deleteExpenseTypeAction(
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

    const { supabase, churchId } = await deleteSessionContext();
    await deleteExpenseType(supabase, churchId, id);
    revalidateExpenseTypesCatalog(churchId);
    revalidatePath("/settings/expenses");
    revalidatePath("/finances/transactions");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo eliminar el tipo de gasto.",
    };
  }
}
