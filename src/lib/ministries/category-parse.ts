import type { MinistryCategoryRow } from "./category-types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function parseMinistryCategoryRow(
  row: unknown,
): MinistryCategoryRow | null {
  const record = asRecord(row);
  if (!record) return null;

  const id = Number(record.id);
  const code = String(record.code ?? "").trim();
  const name = String(record.name ?? "").trim();
  if (!Number.isFinite(id) || !code || !name) return null;

  return {
    id,
    code,
    name,
    description: String(record.description ?? "").trim(),
    sortOrder: Number(record.sort_order ?? record.sortOrder ?? 100) || 100,
    isActive: record.is_active !== false && record.isActive !== false,
    isSystem: record.is_system === true || record.isSystem === true,
  };
}

export function parseMinistryCategoryRows(rows: unknown): MinistryCategoryRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(parseMinistryCategoryRow)
    .filter((row): row is MinistryCategoryRow => row != null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"));
}
