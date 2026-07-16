import { catalogTags } from "@/lib/cache/catalog-tags";
import { parseMinistryCategoryRows } from "@/lib/ministries/category-parse";
import type {
  MinistryCategoryInput,
  MinistryCategoryRow,
} from "@/lib/ministries/category-types";
import { slugifyMinistryCategoryCode } from "@/lib/ministries/category-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

const COLUMNS =
  "id, church_id, code, name, description, sort_order, is_active, is_system";

export async function fetchMinistryCategories(
  supabase: SupabaseClient,
  churchId: number,
): Promise<MinistryCategoryRow[]> {
  return unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from("ministry_category")
        .select(COLUMNS)
        .eq("church_id", churchId)
        .order("sort_order")
        .order("name");

      if (error) {
        const msg = (error.message ?? "").toLowerCase();
        // Tabla aún no migrada / schema cache: catálogo opcional.
        if (
          error.code === "PGRST205" ||
          error.code === "42P01" ||
          msg.includes("ministry_category") ||
          msg.includes("schema cache")
        ) {
          return [];
        }
        throw error;
      }
      return parseMinistryCategoryRows(data);
    },
    ["catalog:ministry-categories", "v1", String(churchId)],
    { tags: [catalogTags.ministryCategories(churchId)], revalidate: 300 },
  )();
}

export async function fetchActiveMinistryCategories(
  supabase: SupabaseClient,
  churchId: number,
): Promise<MinistryCategoryRow[]> {
  const all = await fetchMinistryCategories(supabase, churchId);
  return all.filter((row) => row.isActive);
}

async function ensureUniqueCode(
  supabase: SupabaseClient,
  churchId: number,
  baseCode: string,
): Promise<string> {
  let code = baseCode;
  for (let i = 2; i < 50; i += 1) {
    const { data, error } = await supabase
      .from("ministry_category")
      .select("id")
      .eq("church_id", churchId)
      .eq("code", code)
      .maybeSingle();
    if (error) throw error;
    if (!data) return code;
    code = `${baseCode}_${i}`.slice(0, 48);
  }
  throw new Error("No se pudo generar un código único para la categoría.");
}

export async function saveMinistryCategory(
  supabase: SupabaseClient,
  churchId: number,
  input: MinistryCategoryInput,
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre es obligatorio.");

  const description = input.description.trim();
  const isActive = input.isActive;

  if (input.id) {
    const { data: existing, error: loadError } = await supabase
      .from("ministry_category")
      .select("id, is_system")
      .eq("id", input.id)
      .eq("church_id", churchId)
      .maybeSingle();

    if (loadError) throw loadError;
    if (!existing) throw new Error("Categoría no encontrada.");

    const { error } = await supabase
      .from("ministry_category")
      .update({
        name,
        description,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("church_id", churchId);

    if (error) throw error;
    return;
  }

  const rawCode = (input.code ?? "").trim().toLowerCase();
  const base =
    rawCode && /^[a-z][a-z0-9_]*$/.test(rawCode)
      ? rawCode.slice(0, 40)
      : slugifyMinistryCategoryCode(name);
  const code = await ensureUniqueCode(supabase, churchId, base);

  const { error } = await supabase.from("ministry_category").insert({
    church_id: churchId,
    code,
    name,
    description,
    is_active: isActive,
    is_system: false,
    sort_order: 100,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function deleteMinistryCategory(
  supabase: SupabaseClient,
  churchId: number,
  id: number,
): Promise<void> {
  const { data: existing, error: loadError } = await supabase
    .from("ministry_category")
    .select("id, is_system, code")
    .eq("id", id)
    .eq("church_id", churchId)
    .maybeSingle();

  if (loadError) throw loadError;
  if (!existing) throw new Error("Categoría no encontrada.");
  if (existing.is_system) {
    throw new Error("Esta categoría es del sistema y no se puede eliminar.");
  }

  const { error } = await supabase
    .from("ministry_category")
    .delete()
    .eq("id", id)
    .eq("church_id", churchId);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "No se puede eliminar: hay ministerios que usan esta categoría.",
      );
    }
    throw error;
  }
}
