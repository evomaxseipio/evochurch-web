import { MinistryCategoriesListView } from "@/components/catalog/ministry-categories-list-view";
import { computeCatalogStats } from "@/lib/catalog/parse";
import {
  canDeleteSettingsCatalog,
  canWriteSettingsCatalog,
} from "@/lib/auth/settings-catalog-permissions";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { toMinistryCategoryCatalogRow } from "@/lib/ministries/category-types";
import { fetchMinistryCategories } from "@/lib/services/ministry-categories";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function MinistryCategoriesPage() {
  const tErrors = await getTranslations("errors");
  const session = await requirePageAccess("/settings/ministry-categories");

  const supabase = await createClient();
  let error: string | null = null;
  let rows: ReturnType<typeof toMinistryCategoryCatalogRow>[] = [];

  try {
    const categories = await fetchMinistryCategories(
      supabase,
      session.churchId,
    );
    rows = categories.map(toMinistryCategoryCatalogRow);
  } catch (e) {
    error =
      e instanceof Error ? e.message : tErrors("loadFailed");
  }

  if (error) {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
      >
        {error}
      </p>
    );
  }

  return (
    <MinistryCategoriesListView
      rows={rows}
      stats={computeCatalogStats(rows)}
      canWrite={canWriteSettingsCatalog(
        session.permissions,
        "ministry_categories",
      )}
      canDelete={canDeleteSettingsCatalog(
        session.permissions,
        "ministry_categories",
      )}
    />
  );
}
