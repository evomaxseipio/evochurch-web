"use client";

import {
  deleteMinistryCategoryAction,
  saveMinistryCategoryAction,
} from "@/app/apps/church/(console)/settings/ministry-categories/actions";
import { CatalogTypesListView } from "@/components/catalog/catalog-types-list-view";
import type { CatalogStats } from "@/lib/catalog/types";
import type { MinistryCategoryCatalogRow } from "@/lib/ministries/category-types";
import { useTranslations } from "next-intl";

const STAT_CARDS = [
  {
    key: "total" as const,
    label: "Categorías",
    color: "var(--accent)",
    icon: "pin" as const,
  },
  {
    key: "active" as const,
    label: "Activas",
    color: "var(--success)",
    icon: "check" as const,
  },
  {
    key: "inactive" as const,
    label: "Inactivas",
    color: "var(--muted)",
    icon: "x" as const,
  },
];

export function MinistryCategoriesListView({
  rows,
  stats,
  canWrite = false,
  canDelete = false,
}: {
  rows: MinistryCategoryCatalogRow[];
  stats: CatalogStats;
  canWrite?: boolean;
  canDelete?: boolean;
}) {
  const t = useTranslations("catalogs");
  return (
    <CatalogTypesListView
      rows={rows}
      stats={stats}
      canWrite={canWrite}
      canDelete={canDelete}
      eyebrow={t("configMinistries")}
      title={t("ministryCategories.title")}
      titleAccent={t("churchSuffix")}
      subtitle={t("ministryCategories.subtitle")}
      statCards={STAT_CARDS}
      entityLabel={t("ministryCategories.entityLabel")}
      newLabel={t("ministryCategories.newLabel")}
      exportPrefix="CategoriasMinisterio"
      saveAction={saveMinistryCategoryAction}
      deleteAction={deleteMinistryCategoryAction}
      activeHint={t("ministryCategories.activeHint")}
    />
  );
}
