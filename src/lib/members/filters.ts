import type { Member, MemberFilterKey } from "./types";
import { memberFullName } from "./parse";

export function filterMembers(
  members: Member[],
  filter: MemberFilterKey,
  query: string,
): Member[] {
  const q = query.trim().toLowerCase();

  return members.filter((m) => {
    if (filter === "members" && !m.isMember) return false;
    if (filter === "visits" && m.isMember) return false;
    if (filter === "active" && !m.isActive) return false;
    if (filter === "inactive" && m.isActive) return false;

    if (!q) return true;

    const haystack = [
      memberFullName(m),
      m.membershipRole,
      m.nationality,
      m.contact.email,
      m.contact.phone,
      m.contact.mobilePhone,
      m.address.cityState,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function memberStats(members: Member[]) {
  return {
    total: members.length,
    members: members.filter((m) => m.isMember).length,
    visits: members.filter((m) => !m.isMember).length,
    active: members.filter((m) => m.isActive).length,
    inactive: members.filter((m) => !m.isActive).length,
  };
}
