"use client";

import {
  deleteExpenseTypeAction,
  saveExpenseTypeAction,
} from "@/app/(app)/settings/expenses/actions";
import { CatalogTypesListView } from "@/components/catalog/catalog-types-list-view";
import type { CatalogStats, ExpenseTypeRow } from "@/lib/catalog/types";
import { useTranslations } from "next-intl";

const STAT_CARDS = [
  {
    key: "total" as const,
    label: "Tipos de gasto",
    color: "var(--accent)",
    icon: "wallet" as const,
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

export function ExpenseTypesListView({
  rows,
  stats,
  canWrite = false,
  canDelete = false,
}: {
  rows: ExpenseTypeRow[];
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
      title={t("expense.title")}
      titleAccent={t("churchSuffix")}
      subtitle={t("expense.subtitle")}
      statCards={STAT_CARDS}
      entityLabel={t("expense.entityLabel")}
      newLabel={t("expense.newLabel")}
      exportPrefix="TiposGasto"
      saveAction={saveExpenseTypeAction}
      deleteAction={deleteExpenseTypeAction}
      activeHint={t("expense.activeHint")}
    />
  );
}
