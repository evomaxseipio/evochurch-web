import type {
  MemberCollectionRow,
  MemberFinanceChartPoint,
  MemberFinanceData,
} from "@/lib/members/types";
import type { SupabaseClient } from "@supabase/supabase-js";

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
] as const;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function categoryToType(category: string | null | undefined): number {
  switch (category) {
    case "tithe":
      return 1;
    case "offering":
      return 2;
    case "donation":
      return 3;
    default:
      return 0;
  }
}

function monthShort(m: number): string {
  return m >= 1 && m <= 12 ? MONTH_SHORT[m - 1] : String(m);
}

function formatDateOnly(iso: string): string {
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso;
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function emptyMemberFinanceData(
  message = "No hay contribuciones registradas",
): MemberFinanceData {
  return {
    statusCode: 204,
    message,
    summary: {
      tithesAmount: 0,
      offeringAmount: 0,
      donationAmount: 0,
      totalContributions: 0,
    },
    chartData: [],
    collections: [],
  };
}

/**
 * Misma lógica que Flutter `ContributionsRepository.fetchMemberFinancePayload`:
 * contributors → income_contributors → income_entries (+ catálogo y fondos).
 */
export async function fetchMemberFinancePayload(
  supabase: SupabaseClient,
  churchId: number,
  profileId: string,
  options?: { monthsBack?: number },
): Promise<MemberFinanceData> {
  const monthsBack = options?.monthsBack ?? 12;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const { data: contributorRow, error: contributorError } = await supabase
    .from("contributors")
    .select("contributor_id")
    .eq("profile_id", profileId)
    .eq("church_id", churchId)
    .maybeSingle();

  if (contributorError) throw contributorError;
  if (!contributorRow) return emptyMemberFinanceData();

  const contributorId = String(contributorRow.contributor_id);

  const { data: rows, error: rowsError } = await supabase
    .from("income_contributors")
    .select(
      `
      amount,
      income_entries!income_id(
        income_id, fund_id, amount, payment_date, payment_method, notes,
        is_anonymous,
        income_type_catalog(type_name, category),
        funds(fund_name)
      )
    `,
    )
    .eq("contributor_id", contributorId)
    .gte("income_entries.payment_date", cutoffIso);

  if (rowsError) throw rowsError;
  if (!rows?.length) return emptyMemberFinanceData();

  let tithes = 0;
  let offering = 0;
  let donation = 0;
  const collections: MemberCollectionRow[] = [];
  const monthBuckets = new Map<
    string,
    { tithes: number; offering: number; donation: number }
  >();

  for (const raw of rows) {
    const row = asRecord(raw);
    if (!row) continue;

    const entryRaw = row.income_entries;
    const entry = asRecord(
      Array.isArray(entryRaw) ? entryRaw[0] : entryRaw,
    );
    if (!entry) continue;

    const catMap = asRecord(entry.income_type_catalog);
    const category =
      typeof catMap?.category === "string" ? catMap.category : null;
    const typeName =
      typeof catMap?.type_name === "string" ? catMap.type_name : "";
    const amt = Math.round(Number(entry.amount ?? 0));

    switch (category) {
      case "tithe":
        tithes += amt;
        break;
      case "offering":
        offering += amt;
        break;
      case "donation":
        donation += amt;
        break;
    }

    const pd = new Date(String(entry.payment_date ?? ""));
    const paymentDate = Number.isNaN(pd.getTime()) ? new Date() : pd;
    const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;
    const bucket = monthBuckets.get(monthKey) ?? {
      tithes: 0,
      offering: 0,
      donation: 0,
    };

    switch (category) {
      case "tithe":
        bucket.tithes += amt;
        break;
      case "offering":
        bucket.offering += amt;
        break;
      case "donation":
        bucket.donation += amt;
        break;
    }
    monthBuckets.set(monthKey, bucket);

    collections.push({
      collectionId: String(entry.income_id ?? ""),
      collectionType: categoryToType(category),
      collectionTypeName: typeName || category || "—",
      collectionDate: formatDateOnly(paymentDate.toISOString()),
      collectionAmount: amt,
      paymentMethod: String(entry.payment_method ?? ""),
      comments: String(entry.notes ?? ""),
    });
  }

  if (collections.length === 0) return emptyMemberFinanceData();

  collections.sort((a, b) => {
    const [da, ma, ya] = a.collectionDate.split("/").map(Number);
    const [db, mb, yb] = b.collectionDate.split("/").map(Number);
    return (
      new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime()
    );
  });

  const chartData: MemberFinanceChartPoint[] = [...monthBuckets.keys()]
    .sort()
    .map((key) => {
      const [year, month] = key.split("-");
      const v = monthBuckets.get(key)!;
      return {
        label: `${monthShort(Number(month))} ${year}`,
        tithe: v.tithes,
        offer: v.offering,
        donation: v.donation,
      };
    });

  return {
    statusCode: 200,
    message: "OK",
    summary: {
      tithesAmount: tithes,
      offeringAmount: offering,
      donationAmount: donation,
      totalContributions: tithes + offering + donation,
    },
    chartData,
    collections,
  };
}
