import { memberFullName } from "@/lib/members/parse";
import type { Member, MembersListStats } from "@/lib/members/types";
import type { MembershipDirectoryPayload } from "@/lib/services/reports";

export const DIRECTORY_COLUMN_KEYS = [
  "fullName",
  "role",
  "phone",
  "email",
  "city",
  "member",
  "active",
] as const;

/** Proporciones de ancho (suman 1.0) — alineadas al mockup A4 apaisado. */
export const DIRECTORY_COLUMN_FRACTIONS = {
  idx: 0.03,
  name: 0.2,
  role: 0.13,
  phone: 0.09,
  email: 0.2,
  city: 0.18,
  member: 0.08,
  active: 0.09,
} as const;

export function directoryColumnWidths(totalWidth: number): number[] {
  const f = DIRECTORY_COLUMN_FRACTIONS;
  return [
    totalWidth * f.idx,
    totalWidth * f.name,
    totalWidth * f.role,
    totalWidth * f.phone,
    totalWidth * f.email,
    totalWidth * f.city,
    totalWidth * f.member,
    totalWidth * f.active,
  ];
}

export type DirectoryColumnKey = (typeof DIRECTORY_COLUMN_KEYS)[number];

export function memberPhone(member: Member): string {
  return member.contact.mobilePhone || member.contact.phone || "";
}

export function statPercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function memberDirectoryRow(
  member: Member,
  yesLabel: string,
  noLabel: string,
): string[] {
  return [
    memberFullName(member),
    member.membershipRole || "",
    memberPhone(member),
    member.contact.email || "",
    member.address.cityState || "",
    member.isMember ? yesLabel : noLabel,
    member.isActive ? yesLabel : noLabel,
  ];
}

export function membershipStatsRows(stats: MembersListStats) {
  const total = stats.total || 0;
  return [
    { key: "total" as const, value: stats.total, percent: 100 },
    { key: "members" as const, value: stats.members, percent: statPercent(stats.members, total) },
    { key: "visits" as const, value: stats.visits, percent: statPercent(stats.visits, total) },
    { key: "active" as const, value: stats.active, percent: statPercent(stats.active, total) },
    { key: "inactive" as const, value: stats.inactive, percent: statPercent(stats.inactive, total) },
  ];
}

export function sortMembersByName(
  members: MembershipDirectoryPayload["members"],
): MembershipDirectoryPayload["members"] {
  return [...members].sort((a, b) =>
    memberFullName(a).localeCompare(memberFullName(b), "es", { sensitivity: "base" }),
  );
}

export type MembersPrintPageKind = "only" | "first" | "middle" | "last";

export type MembersPrintPage = {
  kind: MembersPrintPageKind;
  members: MembershipDirectoryPayload["members"];
  startIndex: number;
};

/** Filas por hoja A4 landscape (márgenes 28pt, filas de 13pt). */
const ROWS_ONLY_PAGE = 18; // header + KPIs + tabla + resumen
const ROWS_FIRST_PAGE = 28; // header + KPIs + tabla (sin resumen)
const ROWS_MIDDLE_PAGE = 38; // header + tabla
const ROWS_LAST_PAGE = 18; // header + tabla + resumen

/** Divide miembros en hojas de impresión A4 apaisado (header + KPIs solo en primera). */
export function paginateMembersForPrint(
  members: MembershipDirectoryPayload["members"],
): MembersPrintPage[] {
  if (members.length === 0) {
    return [{ kind: "only", members: [], startIndex: 0 }];
  }
  if (members.length <= ROWS_ONLY_PAGE) {
    return [{ kind: "only", members, startIndex: 0 }];
  }

  // Cabe la tabla en la 1.ª hoja, pero no el resumen → 2.ª hoja solo con resumen.
  if (members.length <= ROWS_FIRST_PAGE) {
    return [
      { kind: "first", members, startIndex: 0 },
      { kind: "last", members: [], startIndex: members.length },
    ];
  }

  const pages: MembersPrintPage[] = [
    {
      kind: "first",
      members: members.slice(0, ROWS_FIRST_PAGE),
      startIndex: 0,
    },
  ];

  let start = ROWS_FIRST_PAGE;
  while (start < members.length) {
    const remaining = members.length - start;
    if (remaining <= ROWS_LAST_PAGE) {
      pages.push({
        kind: "last",
        members: members.slice(start),
        startIndex: start,
      });
      break;
    }

    if (remaining <= ROWS_MIDDLE_PAGE + ROWS_LAST_PAGE) {
      const middleCount = remaining - ROWS_LAST_PAGE;
      pages.push({
        kind: "middle",
        members: members.slice(start, start + middleCount),
        startIndex: start,
      });
      start += middleCount;
      pages.push({
        kind: "last",
        members: members.slice(start),
        startIndex: start,
      });
      break;
    }

    pages.push({
      kind: "middle",
      members: members.slice(start, start + ROWS_MIDDLE_PAGE),
      startIndex: start,
    });
    start += ROWS_MIDDLE_PAGE;
  }

  return pages;
}
