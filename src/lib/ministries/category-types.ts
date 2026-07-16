/** Category row from ministry_category (per church). */
export type MinistryCategoryRow = {
  id: number;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  /** System seeds cannot be deleted. */
  isSystem: boolean;
};

/** For CatalogTypesListView compatibility (isLocked = isSystem). */
export type MinistryCategoryCatalogRow = {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  isLocked: boolean;
  code: string;
};

export type MinistryCategoryInput = {
  id?: number | null;
  name: string;
  description: string;
  isActive: boolean;
  /** Optional on create; auto-slugified from name if empty. Ignored on update. */
  code?: string | null;
};

/** Semantic system codes used by attendance presets and seeds. */
export const SYSTEM_MINISTRY_CATEGORY_CODES = [
  "discipleship",
  "house_group",
  "cell_group",
  "children",
  "worship",
  "other",
] as const;

export type SystemMinistryCategoryCode =
  (typeof SYSTEM_MINISTRY_CATEGORY_CODES)[number];

/** Any category code stored on church_ministries (system or custom). */
export type MinistryCategoryCode = string;

export function isSystemMinistryCategoryCode(
  value: string,
): value is SystemMinistryCategoryCode {
  return (SYSTEM_MINISTRY_CATEGORY_CODES as readonly string[]).includes(value);
}

export function slugifyMinistryCategoryCode(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug || "custom";
}

export function ministryCategoryLabel(
  code: string,
  categories: readonly Pick<MinistryCategoryRow, "code" | "name">[],
): string {
  const found = categories.find((c) => c.code === code);
  return found?.name?.trim() || code;
}

/** Map CatalogTypesListView row shape. */
export function toMinistryCategoryCatalogRow(
  row: MinistryCategoryRow,
): MinistryCategoryCatalogRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    isLocked: row.isSystem,
    code: row.code,
  };
}
