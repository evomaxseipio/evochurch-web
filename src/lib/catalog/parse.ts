import type {
  CatalogStats,
  ExpenseTypeRow,
  IncomeTypeCatalogRow,
} from "@/lib/catalog/types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asString(v: unknown): string {
  return v == null ? "" : String(v);
}

function asNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export function parseExpenseTypesAdmin(data: unknown): ExpenseTypeRow[] {
  const root = asRecord(data);
  if (!root) return [];

  if (root.success === false) {
    throw new Error(
      asString(root.message) || "No se pudieron cargar los tipos de gasto.",
    );
  }

  const list = root.expense_types;
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((row) => {
      const id = asNumber(row.expenses_type_id ?? row.id);
      if (!id) return null;
      const category = asString(row.expenses_category ?? row.category);
      return {
        id,
        name: asString(row.expenses_name ?? row.name),
        category,
        description: asString(row.expenses_description ?? row.description),
        isActive: row.is_active !== false,
        isLocked: category.toUpperCase() === "INTERNO",
      };
    })
    .filter((t): t is ExpenseTypeRow => t !== null);
}

export function parseIncomeTypeCatalogRows(rows: unknown): IncomeTypeCatalogRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((row) => {
      const id = asNumber(row.id);
      if (!id) return null;
      const name = asString(row.type_name);
      return {
        id,
        name,
        description: asString(row.description),
        isActive: row.is_active !== false,
        isLocked: name === "Transferencia",
      };
    })
    .filter((t): t is IncomeTypeCatalogRow => t !== null);
}

export function computeCatalogStats<
  T extends { isActive: boolean },
>(items: T[]): CatalogStats {
  const active = items.filter((i) => i.isActive).length;
  return {
    total: items.length,
    active,
    inactive: items.length - active,
  };
}
