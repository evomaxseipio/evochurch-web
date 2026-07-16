import type { ChildrenRosterScope } from "@/lib/attendance/types";

/**
 * Roster de checklist para activity_type = children:
 * 1) ministry members ∩ niños
 * 2) si vacío → todos los niños activos de la iglesia
 * Nunca incluye adultos/líderes del ministerio.
 */
export function resolveChildrenChecklistIds(
  ministryMemberIds: string[],
  childProfileIds: string[],
): { profileIds: string[]; scope: ChildrenRosterScope } {
  const childSet = new Set(childProfileIds);
  const fromMinistry = ministryMemberIds.filter((id) => childSet.has(id));

  if (fromMinistry.length > 0) {
    return { profileIds: fromMinistry, scope: "ministry" };
  }

  if (childProfileIds.length > 0) {
    return { profileIds: childProfileIds, scope: "church" };
  }

  return { profileIds: [], scope: "empty" };
}
