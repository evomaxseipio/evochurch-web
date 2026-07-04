"use client";

import {
  deleteIncomeTypeAction,
  saveIncomeTypeAction,
} from "@/app/(app)/settings/income-types/actions";
import { CatalogTypesListView } from "@/components/catalog/catalog-types-list-view";
import type { CatalogStats, IncomeTypeCatalogRow } from "@/lib/catalog/types";
import { useTranslations } from "next-intl";

const STAT_CARDS = [
  {
    key: "total" as const,
    label: "Tipos de ingreso",
    color: "var(--d-funds)",
    icon: "trendUp" as const,
  },
  {
    key: "active" as const,
    label: "Activos",
    color: "var(--success)",
    icon: "check" as const,
  },
  {
    key: "inactive" as const,
    label: "Inactivos",
    color: "var(--muted)",
    icon: "x" as const,
  },
];

export function IncomeTypesListView({
  rows,
  stats,
  canWrite = false,
  canDelete = false,
}: {
  rows: IncomeTypeCatalogRow[];
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
      eyebrow={t("configFinances")}
      title={t("income.title")}
      titleAccent={t("churchSuffix")}
      subtitle={t("income.subtitle")}
      statCards={STAT_CARDS}
      entityLabel={t("income.entityLabel")}
      newLabel={t("income.newLabel")}
      exportPrefix="TiposIngreso"
      saveAction={saveIncomeTypeAction}
      deleteAction={deleteIncomeTypeAction}
      activeHint={t("income.activeHint")}
    />
  );
}
