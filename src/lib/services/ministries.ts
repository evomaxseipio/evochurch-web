import { catalogTags } from "@/lib/cache/catalog-tags";
import { parseMinistryRows } from "@/lib/ministries/parse";
import type { Ministry, MinistryFormInput } from "@/lib/ministries/types";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

const MINISTRY_COLORS = new Set(["violet", "lila", "green"]);

const MINISTRY_COLUMNS_BASE =
  "id, name, descripcion, is_active, leader_profile_ids, member_profile_ids, color, is_featured, created_at";

function isMissingColumnError(
  error: { message?: string; code?: string },
  column: string,
): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    (msg.includes(column.toLowerCase()) &&
      (msg.includes("does not exist") || msg.includes("column")))
  );
}

async function fetchMinistriesFromDb(churchId: number): Promise<Ministry[]> {
  const supabase = await createClient();

  const buildQuery = (columns: string) =>
    supabase
      .from("church_ministries")
      .select(columns)
      .eq("church_id", churchId)
      .order("is_featured", { ascending: false })
      .order("name");

  let { data, error } = await buildQuery(
    `${MINISTRY_COLUMNS_BASE}, default_fund_id`,
  );

  if (error && isMissingColumnError(error, "default_fund_id")) {
    ({ data, error } = await buildQuery(MINISTRY_COLUMNS_BASE));
  }

  if (error) throw error;
  return parseMinistryRows(data);
}

export async function fetchMinistries(
  _supabase: SupabaseClient,
  churchId: number,
): Promise<Ministry[]> {
  return unstable_cache(
    () => fetchMinistriesFromDb(churchId),
    ["catalog:ministries", "v4", String(churchId)],
    { tags: [catalogTags.ministries(churchId)], revalidate: 300 },
  )();
}

function normalizeColor(color: string): Ministry["color"] {
  return MINISTRY_COLORS.has(color) ? (color as Ministry["color"]) : "violet";
}

export async function saveMinistry(
  supabase: SupabaseClient,
  churchId: number,
  input: MinistryFormInput & { id?: string | null },
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre es obligatorio.");

  const payload = {
    church_id: churchId,
    name,
    descripcion: input.description.trim(),
    is_active: input.isActive,
    leader_profile_ids: input.leaderProfileIds,
    member_profile_ids: input.memberProfileIds,
    color: normalizeColor(input.color),
    is_featured: input.isFeatured,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from("church_ministries")
      .update(payload)
      .eq("id", input.id)
      .eq("church_id", churchId);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("church_ministries").insert(payload);
  if (error) throw error;
}

export async function deleteMinistry(
  supabase: SupabaseClient,
  churchId: number,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("church_ministries")
    .delete()
    .eq("id", id)
    .eq("church_id", churchId);

  if (error) throw error;
}
