"use server";
import { churchPath } from "@/lib/apps/church-routes";

import { getActionSession } from "@/lib/auth/app-session";
import {
  hasPermission,
  requirePermission,
} from "@/lib/auth/permissions";
import {
  revalidateMinistriesCatalog,
  revalidateFundsCatalog,
} from "@/lib/cache/catalog-tags";
import type {
  MinistryCategory,
  MinistryColor,
  MinistryFormInput,
} from "@/lib/ministries/types";
import { isMinistryCategory } from "@/lib/ministries/types";
import {
  deleteMinistry,
  saveMinistry,
} from "@/lib/services/ministries";
import { setMinistryDefaultFund } from "@/lib/services/funds";
import { revalidatePath } from "next/cache";

export type MinistryActionResult =
  | { ok: true }
  | { ok: false; error: string };

const MINISTRY_COLORS = new Set<MinistryColor>(["violet", "lila", "green"]);

async function sessionContext() {
  const { supabase, session } = await getActionSession();
  return { supabase, churchId: session.churchId, session };
}

async function assertMinistryAccess(
  ministryId: string | null,
): Promise<Awaited<ReturnType<typeof sessionContext>>> {
  const ctx = await sessionContext();
  const { supabase, session } = ctx;

  if (!ministryId) {
    requirePermission(session, "ministerios:write");
    return ctx;
  }

  if (hasPermission(session, "ministerios:write")) return ctx;

  const { data, error } = await supabase.rpc("fn_can_edit_ministry", {
    p_ministry_id: ministryId,
  });
  if (error || data !== true) {
    throw new Error("No tienes permiso para modificar este ministerio.");
  }
  return ctx;
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
  const categoryRaw = String(formData.get("category") ?? "other").trim();
  const category: MinistryCategory = isMinistryCategory(categoryRaw)
    ? categoryRaw
    : "other";

  return {
    id,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    category,
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

    const { supabase, churchId } = await assertMinistryAccess(input.id);
    await saveMinistry(supabase, churchId, input);
    revalidateMinistriesCatalog(churchId);
    revalidatePath(churchPath("/ministerios"));
    revalidatePath(churchPath("/attendance"));
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

    const { supabase, churchId } = await assertMinistryAccess(id);
    await deleteMinistry(supabase, churchId, id);
    revalidateMinistriesCatalog(churchId);
    revalidatePath(churchPath("/ministerios"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo eliminar el ministerio.",
    };
  }
}

export async function setMinistryDefaultFundAction(
  _prev: MinistryActionResult | null,
  formData: FormData,
): Promise<MinistryActionResult> {
  try {
    const ministryId = String(formData.get("ministryId") ?? "").trim();
    const fundId = String(formData.get("fundId") ?? "").trim();
    if (!ministryId || !fundId) {
      return { ok: false, error: "Registro no válido." };
    }

    const { supabase, churchId } = await assertMinistryAccess(ministryId);
    await setMinistryDefaultFund(supabase, churchId, ministryId, fundId);
    revalidateMinistriesCatalog(churchId);
    revalidateFundsCatalog(churchId);
    revalidatePath(churchPath("/ministerios"));
    revalidatePath(churchPath("/finances/funds"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "No se pudo establecer el fondo principal.",
    };
  }
}
