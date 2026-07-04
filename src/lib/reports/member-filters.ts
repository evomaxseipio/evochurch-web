import type { MemberFilterKey } from "@/lib/members/types";

export const MEMBER_FILTER_LABELS: Record<MemberFilterKey, string> = {
  all: "Todos",
  members: "Miembros",
  visits: "Visitas",
  active: "Activos",
  inactive: "Inactivos",
};

export const MEMBER_FILTER_OPTIONS: MemberFilterKey[] = [
  "all",
  "members",
  "visits",
  "active",
  "inactive",
];
