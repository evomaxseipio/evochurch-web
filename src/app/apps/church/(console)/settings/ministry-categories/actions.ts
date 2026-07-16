"use server";
import { churchPath } from "@/lib/apps/church-routes";

import { getActionSessionWith } from "@/lib/auth/permissions-server";
import {
  revalidateMinistriesCatalog,
  revalidateMinistryCategoriesCatalog,
} from "@/lib/cache/catalog-tags";
import type { MinistryCategoryInput } from "@/lib/ministries/category-types";
import {
  deleteMinistryCategory,
  saveMinistryCategory,
} from "@/lib/services/ministry-categories";
import { revalidatePath } from "next/cache";

export type CatalogActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function writeSessionContext() {
  const { supabase, session } = await getActionSessionWith(
    "settings:ministry_categories:write",
  );
  return { supabase, churchId: session.churchId };
}

async function deleteSessionContext() {
  const { supabase, session } = await getActionSessionWith(
    "settings:ministry_categories:delete",
  );
  return { supabase, churchId: session.churchId };
}

function parseCatalogInput(formData: FormData): MinistryCategoryInput {
  const idRaw = String(formData.get("id") ?? "").trim();
  const id = idRaw ? Number.parseInt(idRaw, 10) : null;

  return {
    id: id && Number.isFinite(id) ? id : null,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    isActive: formData.get("isActive") === "true",
    code: String(formData.get("code") ?? "").trim() || null,
  };
}

function validateCatalogInput(input: MinistryCategoryInput): string | null {
  if (!input.name) return "El nombre es obligatorio.";
  if (input.name.length > 120) {
    return "El nombre no puede superar 120 caracteres.";
  }
  if (input.description.length > 500) {
    return "La descripción no puede superar 500 caracteres.";
  }
  return null;
}

export async function saveMinistryCategoryAction(
  _prev: CatalogActionResult | null,
  formData: FormData,
): Promise<CatalogActionResult> {
  try {
    const input = parseCatalogInput(formData);
    const validationError = validateCatalogInput(input);
    if (validationError) return { ok: false, error: validationError };

    const { supabase, churchId } = await writeSessionContext();
    await saveMinistryCategory(supabase, churchId, input);
    revalidateMinistryCategoriesCatalog(churchId);
    revalidateMinistriesCatalog(churchId);
    revalidatePath(churchPath("/settings/ministry-categories"));
    revalidatePath(churchPath("/ministerios"));
    revalidatePath(churchPath("/attendance"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "No se pudo guardar la categoría de ministerio.",
    };
  }
}

export async function deleteMinistryCategoryAction(
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
        error: "Esta categoría es del sistema y no se puede eliminar.",
      };
    }

    const { supabase, churchId } = await deleteSessionContext();
    await deleteMinistryCategory(supabase, churchId, id);
    revalidateMinistryCategoriesCatalog(churchId);
    revalidateMinistriesCatalog(churchId);
    revalidatePath(churchPath("/settings/ministry-categories"));
    revalidatePath(churchPath("/ministerios"));
    revalidatePath(churchPath("/attendance"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "No se pudo eliminar la categoría de ministerio.",
    };
  }
}
