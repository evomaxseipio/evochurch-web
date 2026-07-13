export type MinistryColor = "violet" | "lila" | "green";

export const MINISTRY_CATEGORIES = [
  "discipleship",
  "house_group",
  "children",
  "worship",
  "other",
] as const;

export type MinistryCategory = (typeof MINISTRY_CATEGORIES)[number];

export type Ministry = {
  id: string;
  name: string;
  description: string;
  category: MinistryCategory;
  leaderProfileIds: string[];
  memberProfileIds: string[];
  color: MinistryColor;
  isActive: boolean;
  isFeatured: boolean;
  defaultFundId: string | null;
  createdAt: string;
};

export type MinistryStatusFilter = "all" | "active" | "inactive";

export type MinistryCategoryFilter = "all" | MinistryCategory;

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
  category: MinistryCategory;
  leaderProfileIds: string[];
  memberProfileIds: string[];
  color: MinistryColor;
  isActive: boolean;
  isFeatured: boolean;
};

export function isMinistryCategory(value: string): value is MinistryCategory {
  return (MINISTRY_CATEGORIES as readonly string[]).includes(value);
}

/** Default category sugerida según activity_type de asistencia. */
export function ministryCategoryForActivityType(
  activityType: string,
): MinistryCategory | null {
  switch (activityType) {
    case "house_group":
      return "house_group";
    case "bible_study":
      return "discipleship";
    case "children":
      return "children";
    case "service":
      return "worship";
    default:
      return null;
  }
}
