import type { Fund } from "@/lib/funds/types";
import type {
  Contribution,
  ContributionCategory,
  ContributionsStats,
  CollectionMode,
  DonorKind,
  FundDistributionSlice,
  TopContributor,
} from "@/lib/contributions/types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

function parseCategory(v: unknown): ContributionCategory {
  const s = asString(v).toLowerCase();
  if (s === "tithe" || s === "offering" || s === "donation") return s;
  return "offering";
}

function parseCollectionMode(v: unknown): CollectionMode {
  return asString(v).toLowerCase() === "collective" ? "collective" : "individual";
}

function parseDonorKind(v: unknown): DonorKind | null {
  const s = asString(v).toLowerCase();
  if (s === "member" || s === "visitor" || s === "anonymous" || s === "company") {
    return s;
  }
  return null;
}

function parsePrimaryDonor(incomeContributors: unknown): {
  donorKind: DonorKind | null;
  profileId: string | null;
  companyName: string | null;
} {
  const list = Array.isArray(incomeContributors) ? incomeContributors : [];
  if (list.length === 0) {
    return { donorKind: null, profileId: null, companyName: null };
  }

  const primary =
    list.find((item) => asRecord(item)?.is_primary === true) ?? list[0];
  const row = asRecord(primary);
  const contributors = asRecord(row?.contributors);
  if (!contributors) {
    return { donorKind: null, profileId: null, companyName: null };
  }

  if (contributors.is_anonymous === true) {
    return { donorKind: "anonymous", profileId: null, companyName: null };
  }

  const company = asString(contributors.company_name).trim();
  const profileId = asString(contributors.profile_id).trim() || null;
  const donorKind = parseDonorKind(contributors.contributor_type);

  if (company) {
    return { donorKind: "company", profileId: null, companyName: company };
  }

  return {
    donorKind: donorKind ?? (profileId ? "member" : null),
    profileId,
    companyName: null,
  };
}

function contributorFromRow(raw: unknown): string {
  const row = asRecord(raw);
  if (!row) return "—";

  const contributors = asRecord(row.contributors);
  if (!contributors) return "—";

  if (contributors.is_anonymous === true) return "Anónimo";

  const company = asString(contributors.company_name).trim();
  if (company) return company;

  const profiles = asRecord(contributors.profiles);
  if (profiles) {
    const first = asString(profiles.first_name).trim();
    const last = asString(profiles.last_name).trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
  }

  const type = asString(contributors.contributor_type).toLowerCase();
  if (type === "visitor") return "Visitante";
  if (type === "anonymous") return "Anónimo";

  return "—";
}

function resolveContributorLabel(
  collectionMode: CollectionMode,
  isAnonymous: boolean,
  incomeContributors: unknown,
): string {
  if (collectionMode === "collective") return "Ofrenda colectiva";
  if (isAnonymous) return "Anónimo";

  const list = Array.isArray(incomeContributors) ? incomeContributors : [];
  if (list.length === 0) return "—";

  const primary =
    list.find((item) => asRecord(item)?.is_primary === true) ?? list[0];
  return contributorFromRow(primary);
}

export function parseIncomeEntryRow(row: Record<string, unknown>): Contribution {
  const catalog = asRecord(row.income_type_catalog);
  const funds = asRecord(row.funds);
  const category = parseCategory(catalog?.category);
  const collectionMode = parseCollectionMode(row.collection_mode);
  const incomeContributors = row.income_contributors;
  const donor =
    collectionMode === "collective"
      ? { donorKind: null, profileId: null, companyName: null }
      : parsePrimaryDonor(incomeContributors);

  return {
    incomeId: asString(row.income_id),
    fundId: asString(row.fund_id),
    fundName: asString(funds?.fund_name) || "—",
    incomeTypeId: asNumber(row.income_type_id),
    category,
    typeName: asString(catalog?.type_name) || category,
    collectionMode,
    amount: Math.round(asNumber(row.amount)),
    paymentDate: asString(row.payment_date),
    paymentMethod: asString(row.payment_method),
    isAnonymous: row.is_anonymous === true,
    notes: row.notes ? asString(row.notes) : null,
    contributorLabel: resolveContributorLabel(
      collectionMode,
      row.is_anonymous === true,
      incomeContributors,
    ),
    donorKind: donor.donorKind,
    profileId: donor.profileId,
    companyName: donor.companyName,
    createdAt: row.created_at ? asString(row.created_at) : null,
  };
}

export function parseIncomeEntriesResponse(data: unknown): Contribution[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map(parseIncomeEntryRow)
    .filter((c) => c.incomeId.length > 0);
}

export function computeContributionsStats(
  entries: Contribution[],
): ContributionsStats {
  let tithes = 0;
  let offerings = 0;
  let donations = 0;

  for (const e of entries) {
    switch (e.category) {
      case "tithe":
        tithes += e.amount;
        break;
      case "offering":
        offerings += e.amount;
        break;
      case "donation":
        donations += e.amount;
        break;
    }
  }

  return {
    total: tithes + offerings + donations,
    tithes,
    offerings,
    donations,
  };
}

const CO_MES = [
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

export function formatContributionDate(iso: string): string {
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso;
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/** Formato tabla — `project/contribuciones.jsx` coFmtDate */
export function formatContributionDateShort(iso: string): string {
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso;
  const [y, m, day] = d.split("-").map(Number);
  return `${String(day).padStart(2, "0")} ${CO_MES[m - 1]} ${y}`;
}

export function categoryChipClass(
  category: ContributionCategory,
): "violet" | "info" | "green" {
  switch (category) {
    case "tithe":
      return "violet";
    case "offering":
      return "info";
    case "donation":
      return "green";
  }
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case "Cash":
      return "Efectivo";
    case "Transfer":
      return "Transferencia";
    case "Cheque":
      return "Cheque";
    case "Card":
      return "Tarjeta";
    default:
      return method || "—";
  }
}

export function categoryStyle(category: ContributionCategory) {
  switch (category) {
    case "tithe":
      return { label: "Diezmo", color: "#5b21b6", bg: "#5b21b622" };
    case "offering":
      return { label: "Ofrenda", color: "#2563eb", bg: "#2563eb22" };
    case "donation":
      return { label: "Donación", color: "#15803d", bg: "#15803d22" };
  }
}

const FUND_SLICE_COLORS = [
  "var(--primary)",
  "var(--accent)",
  "var(--success)",
  "#A855F7",
];

function contributorSubtitle(entry: Contribution): string {
  if (entry.donorKind === "company") return "Empresa";
  if (entry.donorKind === "visitor") return "Visitante";
  if (entry.category === "tithe") return "Diezmo";
  if (entry.category === "offering") return "Ofrenda";
  if (entry.category === "donation") return "Donación";
  return "Contribuyente";
}

export function computeTopContributors(
  entries: Contribution[],
  limit = 8,
): TopContributor[] {
  const map = new Map<string, TopContributor>();

  for (const entry of entries) {
    if (entry.collectionMode === "collective") continue;
    if (entry.isAnonymous || entry.donorKind === "anonymous") continue;

    const key = entry.profileId ?? entry.contributorLabel;
    const existing = map.get(key);
    if (existing) {
      existing.amount += entry.amount;
      continue;
    }

    map.set(key, {
      key,
      name: entry.contributorLabel,
      subtitle: contributorSubtitle(entry),
      amount: entry.amount,
      profileId: entry.profileId,
    });
  }

  return Array.from(map.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function computeFundDistribution(
  entries: Contribution[],
  funds: Fund[],
): { slices: FundDistributionSlice[]; total: number } {
  const byFund = new Map<string, number>();
  for (const entry of entries) {
    byFund.set(entry.fundId, (byFund.get(entry.fundId) ?? 0) + entry.amount);
  }

  const slices = funds
    .map((fund, index) => ({
      fundId: fund.fundId,
      label: fund.name,
      amount: byFund.get(fund.fundId) ?? 0,
      color: FUND_SLICE_COLORS[index % FUND_SLICE_COLORS.length],
    }))
    .filter((slice) => slice.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  return { slices, total };
}

export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
