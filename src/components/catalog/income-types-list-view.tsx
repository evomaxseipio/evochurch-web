"use client";

import {
  deleteIncomeTypeAction,
  saveIncomeTypeAction,
} from "@/app/(app)/settings/income-types/actions";
import { CatalogTypesListView } from "@/components/catalog/catalog-types-list-view";
import type { CatalogStats, IncomeTypeCatalogRow } from "@/lib/catalog/types";

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
}: {
  rows: IncomeTypeCatalogRow[];
  stats: CatalogStats;
}) {
  return (
    <CatalogTypesListView
      rows={rows}
      stats={stats}
      eyebrow="Configuración · Finanzas"
      title="Tipos de ingreso"
      titleAccent="de la iglesia"
      subtitle="Categorías para clasificar las entradas de dinero operacionales."
      statCards={STAT_CARDS}
      entityLabel="Tipo de ingreso"
      newLabel="Nuevo tipo de ingreso"
      exportPrefix="TiposIngreso"
      saveAction={saveIncomeTypeAction}
      deleteAction={deleteIncomeTypeAction}
      activeHint="Si está inactivo, no aparecerá al registrar nuevos ingresos operacionales."
    />
  );
}
