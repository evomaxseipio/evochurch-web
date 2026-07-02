export type MinistryColor = "violet" | "lila" | "green";

export type Ministry = {
  id: string;
  name: string;
  description: string;
  leaderProfileIds: string[];
  memberProfileIds: string[];
  color: MinistryColor;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
};

export type MinistryStatusFilter = "all" | "active" | "inactive";

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
  leaderProfileIds: string[];
  memberProfileIds: string[];
  color: MinistryColor;
  isActive: boolean;
  isFeatured: boolean;
};
