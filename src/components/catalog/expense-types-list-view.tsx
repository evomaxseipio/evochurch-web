"use client";

import {
  deleteExpenseTypeAction,
  saveExpenseTypeAction,
} from "@/app/(app)/settings/expenses/actions";
import { CatalogTypesListView } from "@/components/catalog/catalog-types-list-view";
import type { CatalogStats, ExpenseTypeRow } from "@/lib/catalog/types";

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
}: {
  rows: ExpenseTypeRow[];
  stats: CatalogStats;
}) {
  return (
    <CatalogTypesListView
      rows={rows}
      stats={stats}
      eyebrow="Configuración · Finanzas"
      title="Tipos de gasto"
      titleAccent="de la iglesia"
      subtitle="Categorías para clasificar las salidas de dinero en transacciones."
      statCards={STAT_CARDS}
      entityLabel="Tipo de gasto"
      newLabel="Nuevo tipo de gasto"
      exportPrefix="TiposGasto"
      saveAction={saveExpenseTypeAction}
      deleteAction={deleteExpenseTypeAction}
      activeHint="Si está inactivo, no aparecerá al registrar nuevas transacciones."
    />
  );
}
