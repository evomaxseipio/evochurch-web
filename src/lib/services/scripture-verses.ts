import { daysSinceEpoch } from "@/lib/dashboard/period";
import type { ScriptureVerse } from "@/lib/dashboard/types";
import { catalogTags } from "@/lib/cache/catalog-tags";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

type VerseRow = {
  id: number;
  reference: string;
  text: string;
};

const FALLBACK_VERSES: ScriptureVerse[] = [
  {
    reference: "Mateo 18:20",
    text: "Porque donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos.",
  },
];

export async function fetchDailyScriptureVerse(
  supabase: SupabaseClient,
): Promise<ScriptureVerse> {
  const dayKey = String(daysSinceEpoch());
  return unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from("scripture_verses")
        .select("id, reference, text")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (error || !data?.length) {
        return FALLBACK_VERSES[0];
      }

      const verses = data as VerseRow[];
      const index = daysSinceEpoch() % verses.length;
      const picked = verses[index] ?? verses[0];
      return {
        reference: picked.reference,
        text: picked.text,
      };
    },
    ["catalog:scripture-daily", dayKey],
    { tags: [catalogTags.scriptureDaily()], revalidate: 86_400 },
  )();
}
