"use server";

import { getActionSession } from "@/lib/auth/app-session";
import { revalidateMinistriesCatalog } from "@/lib/cache/catalog-tags";
import type { MinistryColor, MinistryFormInput } from "@/lib/ministries/types";
import {
  deleteMinistry,
  saveMinistry,
} from "@/lib/services/ministries";
import { revalidatePath } from "next/cache";

export type MinistryActionResult =
  | { ok: true }
  | { ok: false; error: string };

const MINISTRY_COLORS = new Set<MinistryColor>(["violet", "lila", "green"]);

async function sessionContext() {
  const { supabase, session } = await getActionSession();
  return { supabase, churchId: session.churchId };
}

function parseProfileIds(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
  } catch {
    return [];
  }
}

function parseMinistryInput(formData: FormData): MinistryFormInput & {
  id: string | null;
} {
  const id = String(formData.get("id") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "violet") as MinistryColor;

  return {
    id,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    leaderProfileIds: parseProfileIds(
      String(formData.get("leaderProfileIds") ?? "").trim(),
    ),
    memberProfileIds: parseProfileIds(
      String(formData.get("memberProfileIds") ?? "").trim(),
    ),
    color: MINISTRY_COLORS.has(color) ? color : "violet",
    isActive: formData.get("isActive") === "true",
    isFeatured: formData.get("isFeatured") === "true",
  };
}

function validateMinistryInput(
  input: MinistryFormInput,
): string | null {
  if (!input.name) return "El nombre es obligatorio.";
  if (input.name.length > 120) {
    return "El nombre no puede superar 120 caracteres.";
  }
  if (input.leaderProfileIds.length === 0) {
    return "Selecciona al menos un líder.";
  }
  if (input.description.length > 700) {
    return "La descripción no puede superar 700 caracteres (~100 palabras).";
  }
  return null;
}

export async function saveMinistryAction(
  _prev: MinistryActionResult | null,
  formData: FormData,
): Promise<MinistryActionResult> {
  try {
    const input = parseMinistryInput(formData);
    const validationError = validateMinistryInput(input);
    if (validationError) return { ok: false, error: validationError };

    const { supabase, churchId } = await sessionContext();
    await saveMinistry(supabase, churchId, input);
    revalidateMinistriesCatalog(churchId);
    revalidatePath("/ministerios");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo guardar el ministerio.",
    };
  }
}

export async function deleteMinistryAction(
  _prev: MinistryActionResult | null,
  formData: FormData,
): Promise<MinistryActionResult> {
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { ok: false, error: "Registro no válido." };

    const { supabase, churchId } = await sessionContext();
    await deleteMinistry(supabase, churchId, id);
    revalidateMinistriesCatalog(churchId);
    revalidatePath("/ministerios");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo eliminar el ministerio.",
    };
  }
}
