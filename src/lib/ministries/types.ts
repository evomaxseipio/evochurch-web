import type { MinistryCategoryCode } from "./category-types";

export type { MinistryCategoryCode, MinistryCategoryRow } from "./category-types";
export {
  SYSTEM_MINISTRY_CATEGORY_CODES,
  isSystemMinistryCategoryCode,
  ministryCategoryLabel,
  slugifyMinistryCategoryCode,
} from "./category-types";

export type MinistryColor = "violet" | "lila" | "green";

/** @deprecated Prefer SYSTEM_MINISTRY_CATEGORY_CODES + DB catalog. Kept for attendance seeds. */
export const MINISTRY_CATEGORIES = [
  "discipleship",
  "house_group",
  "cell_group",
  "children",
  "worship",
  "other",
] as const;

/** Category code on a ministry (system or custom from BD). */
export type MinistryCategory = MinistryCategoryCode;

export type Ministry = {
  id: string;
  name: string;
  description: string;
  category: MinistryCategoryCode;
  leaderProfileIds: string[];
  memberProfileIds: string[];
  color: MinistryColor;
  isActive: boolean;
  isFeatured: boolean;
  defaultFundId: string | null;
  createdAt: string;
};

export type MinistryStatusFilter = "all" | "active" | "inactive";

export type MinistryCategoryFilter = "all" | MinistryCategoryCode;

export type MinistryViewMode = "grid" | "list";

export type MinistryStats = {
  total: number;
  active: number;
  leaders: number;
  members: number;
};

export type MinistryFormInput = {
  name: string;
  description: string;
  category: MinistryCategoryCode;
  leaderProfileIds: string[];
  memberProfileIds: string[];
  color: MinistryColor;
  isActive: boolean;
  isFeatured: boolean;
};

export function isMinistryCategory(value: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(value.trim());
}

/**
 * Codes preferidos según activity_type de asistencia.
 * Casa incluye cell_group (Célula).
 */
export function ministryCategoryCodesForActivityType(
  activityType: string,
): MinistryCategoryCode[] {
  switch (activityType) {
    case "house_group":
      return ["house_group", "cell_group"];
    case "bible_study":
      return ["discipleship"];
    case "children":
      return ["children"];
    case "service":
      return ["worship"];
    default:
      return [];
  }
}

/** @deprecated Use ministryCategoryCodesForActivityType */
export function ministryCategoryForActivityType(
  activityType: string,
): MinistryCategoryCode | null {
  const codes = ministryCategoryCodesForActivityType(activityType);
  return codes[0] ?? null;
}
