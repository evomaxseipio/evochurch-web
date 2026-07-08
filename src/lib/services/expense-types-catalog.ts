import {
  parseExpenseTypesAdmin,
} from "@/lib/catalog/parse";
import type { CatalogItemInput, ExpenseTypeRow } from "@/lib/catalog/types";
import { catalogTags } from "@/lib/cache/catalog-tags";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

export async function fetchAllExpenseTypes(
  supabase: SupabaseClient,
  churchId: number,
): Promise<ExpenseTypeRow[]> {
  return unstable_cache(
    async () => {
      const { data, error } = await supabase.rpc("spgetexpensestypes", {
        p_church_id: churchId,
      });

      if (error) throw error;
      return parseExpenseTypesAdmin(data);
    },
    ["catalog:expense-types", String(churchId)],
    { tags: [catalogTags.expenseTypes(churchId)], revalidate: 300 },
  )();
}

export async function saveExpenseType(
  supabase: SupabaseClient,
  churchId: number,
  input: CatalogItemInput,
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre es obligatorio.");

  if (input.id) {
    const { error } = await supabase
      .from("expenses_type")
      .update({
        expenses_name: name,
        expenses_description: input.description.trim(),
        is_active: input.isActive,
      })
      .eq("expenses_type_id", input.id)
      .eq("church_id", churchId);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("expenses_type").insert({
    church_id: churchId,
    expenses_name: name,
    expenses_category: "GENERAL",
    expenses_description: input.description.trim(),
    is_active: input.isActive,
  });

  if (error) throw error;
}

export async function deleteExpenseType(
  supabase: SupabaseClient,
  churchId: number,
  id: number,
): Promise<void> {
  const { error } = await supabase
    .from("expenses_type")
    .delete()
    .eq("expenses_type_id", id)
    .eq("church_id", churchId);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "No se puede eliminar: este tipo está en uso en transacciones.",
      );
    }
    throw error;
  }
}
