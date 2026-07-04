import { memberFullName } from "@/lib/members/parse";
import type { Member } from "@/lib/members/types";
import type {
  Ministry,
  MinistryColor,
  MinistryStats,
  MinistryStatusFilter,
} from "./types";

const MINISTRY_COLORS = new Set<MinistryColor>(["violet", "lila", "green"]);

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function toDateOnly(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  return value.slice(0, 10);
}

export function profileIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function parseMinistryRow(row: unknown): Ministry | null {
  const record = asRecord(row);
  if (!record) return null;

  const id = String(record.id ?? "").trim();
  const name = String(record.name ?? "").trim();
  if (!id || !name) return null;

  const colorRaw = String(record.color ?? "violet");
  const color = MINISTRY_COLORS.has(colorRaw as MinistryColor)
    ? (colorRaw as MinistryColor)
    : "violet";

  const legacyLeader =
    record.leader_profile_id ??
    (record as { leaderProfileId?: unknown }).leaderProfileId;

  return {
    id,
    name,
    description: String(record.descripcion ?? record.description ?? "").trim(),
    leaderProfileIds: profileIds(
      record.leader_profile_ids ??
        (record as { leaderProfileIds?: unknown }).leaderProfileIds ??
        legacyLeader,
    ),
    memberProfileIds: profileIds(
      record.member_profile_ids ??
        (record as { memberProfileIds?: unknown }).memberProfileIds,
    ),
    color,
    isActive: record.is_active !== false,
    isFeatured: record.is_featured === true,
    createdAt: toDateOnly(record.created_at),
  };
}

export function parseMinistryRows(rows: unknown): Ministry[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(parseMinistryRow)
    .filter((row): row is Ministry => row != null);
}

export function computeMinistryStats(items: Ministry[]): MinistryStats {
  const leaderIds = new Set<string>();
  for (const item of items) {
    for (const id of profileIds(item.leaderProfileIds)) {
      leaderIds.add(id);
    }
  }
  const members = items.reduce(
    (sum, item) => sum + profileIds(item.memberProfileIds).length,
    0,
  );

  return {
    total: items.length,
    active: items.filter((item) => item.isActive).length,
    leaders: leaderIds.size,
    members,
  };
}

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const COLOR_MAP: Record<MinistryColor, string> = {
  lila: "var(--lila)",
  violet: "var(--accent)",
  green: "var(--success)",
};

export function ministryColorCss(color: MinistryColor): string {
  return COLOR_MAP[color] ?? "var(--accent)";
}

export function formatMinistryDate(value: string): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

export function resolveMinistryLeaders(
  ministry: Ministry,
  members: Member[],
): Member[] {
  return profileIds(ministry.leaderProfileIds)
    .map((id) => members.find((m) => m.memberId === id))
    .filter((member): member is Member => member != null)
    .sort((a, b) =>
      memberFullName(a).localeCompare(memberFullName(b), "es"),
    );
}

export function resolveMinistryMembers(
  ministry: Ministry,
  members: Member[],
): Member[] {
  return profileIds(ministry.memberProfileIds)
    .map((id) => members.find((m) => m.memberId === id))
    .filter((member): member is Member => member != null)
    .sort((a, b) =>
      memberFullName(a).localeCompare(memberFullName(b), "es"),
    );
}

export function ministryLeaderNames(
  ministry: Ministry,
  members: Member[],
): string {
  const names = profileIds(ministry.leaderProfileIds)
    .map((id) => members.find((m) => m.memberId === id))
    .filter((member): member is Member => member != null)
    .map((member) => memberFullName(member));

  if (names.length === 0) return "—";
  if (names.length === 2) return names.join(" y ");
  return names.join(" · ");
}

export function filterMinistries(
  items: Ministry[],
  query: string,
  status: MinistryStatusFilter,
  members: Member[],
): Ministry[] {
  const q = query.trim().toLowerCase();

  return items.filter((item) => {
    if (status === "active" && !item.isActive) return false;
    if (status === "inactive" && item.isActive) return false;

    if (!q) return true;

    const leaders = ministryLeaderNames(item, members).toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      leaders.includes(q)
    );
  });
}

export function sortMinistriesForDisplay(items: Ministry[]): Ministry[] {
  return [...items].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "es");
  });
}
