import { parseIncomeTypeCatalogRows } from "@/lib/catalog/parse";
import type {
  CatalogItemInput,
  IncomeTypeCatalogRow,
} from "@/lib/catalog/types";
import { catalogTags } from "@/lib/cache/catalog-tags";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

async function fetchOperationalIncomeTypeCatalogFromDb(
  churchId: number,
): Promise<IncomeTypeCatalogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("income_type_catalog")
    .select("id, type_name, description, is_active")
    .eq("church_id", churchId)
    .eq("is_operational", true)
    .order("id");

  if (error) throw error;
  return parseIncomeTypeCatalogRows(data);
}

export async function fetchOperationalIncomeTypeCatalog(
  _supabase: SupabaseClient,
  churchId: number,
): Promise<IncomeTypeCatalogRow[]> {
  return unstable_cache(
    () => fetchOperationalIncomeTypeCatalogFromDb(churchId),
    ["catalog:income-types-operational", String(churchId)],
    { tags: [catalogTags.incomeTypesOperational(churchId)], revalidate: 300 },
  )();
}

export async function saveIncomeTypeCatalogItem(
  supabase: SupabaseClient,
  churchId: number,
  input: CatalogItemInput,
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre es obligatorio.");

  if (input.id) {
    const { error } = await supabase
      .from("income_type_catalog")
      .update({
        type_name: name,
        description: input.description.trim(),
        is_active: input.isActive,
      })
      .eq("id", input.id)
      .eq("church_id", churchId)
      .eq("is_operational", true);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("income_type_catalog").insert({
    church_id: churchId,
    type_name: name,
    category: "special",
    description: input.description.trim(),
    is_operational: true,
    is_active: input.isActive,
  });

  if (error) throw error;
}

export async function deleteIncomeTypeCatalogItem(
  supabase: SupabaseClient,
  churchId: number,
  id: number,
): Promise<void> {
  const { error } = await supabase
    .from("income_type_catalog")
    .delete()
    .eq("id", id)
    .eq("church_id", churchId)
    .eq("is_operational", true);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "No se puede eliminar: este tipo está en uso en ingresos registrados.",
      );
    }
    throw error;
  }
}
