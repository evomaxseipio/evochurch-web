import type { Fund, FundsListStats } from "@/lib/funds/types";

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

function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1) return true;
  if (v === "false" || v === 0) return false;
  return fallback;
}

function parseFundRow(row: Record<string, unknown>): Fund {
  return {
    fundId: asString(row.fund_id),
    churchId: asNumber(row.church_id),
    name: asString(row.fund_name),
    description: asString(row.description),
    targetAmount: asNumber(row.target_amount),
    startDate: asString(row.start_date),
    endDate: row.end_date ? asString(row.end_date) : null,
    totalContributions: asNumber(row.total_contributions),
    isActive: asBool(row.is_active, true),
    isPrimary: asBool(row.is_primary, false),
    createdAt: row.created_at ? asString(row.created_at) : null,
    updatedAt: row.updated_at ? asString(row.updated_at) : null,
  };
}

export function parseFundsResponse(data: unknown): Fund[] {
  const root = asRecord(data);
  if (!root) return [];

  if (root.success === false) {
    throw new Error(asString(root.message) || "No se pudieron cargar los fondos.");
  }

  const list = root.fund_list;
  if (!Array.isArray(list)) return [];

  const funds = list
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map(parseFundRow)
    .filter((f) => f.fundId.length > 0);

  return sortFunds(funds);
}

/** Fondo primario primero; opcional comparador para el resto. */
export function sortFunds(
  funds: Fund[],
  thenBy?: (a: Fund, b: Fund) => number,
): Fund[] {
  return [...funds].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return thenBy ? thenBy(a, b) : 0;
  });
}

export function computeFundsStats(funds: Fund[]): FundsListStats {
  const total = funds.length;
  const active = funds.filter((f) => f.isActive).length;
  const totalRaised = funds.reduce((sum, f) => sum + f.totalContributions, 0);
  const totalGoal = funds.reduce((sum, f) => sum + f.targetAmount, 0);
  const goalProgress =
    totalGoal > 0 ? Math.min(100, (totalRaised / totalGoal) * 100) : 0;

  return { total, active, totalRaised, goalProgress };
}

export function fundProgressPct(fund: Fund): number {
  if (!fund.targetAmount || fund.targetAmount <= 0) return 0;
  return Math.min(100, (fund.totalContributions / fund.targetAmount) * 100);
}

const MONTH_SHORT = [
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

export function formatFundDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${String(d).padStart(2, "0")} ${MONTH_SHORT[m - 1] ?? m} ${y}`;
}
