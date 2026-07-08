import type { SupabaseClient } from "@supabase/supabase-js";

export type NetworkChurchKpis = {
  churchId: number;
  memberCount: number;
  fundBalance: number;
  monthIncome: number;
};

export type NetworkCampusRow = {
  id: number;
  name: string;
  shortName: string | null;
  slug: string;
  city: string | null;
  churchKind: string;
  parentChurchId: number | null;
  kpis: NetworkChurchKpis;
};

export type NetworkDashboardPayload = {
  headquartersId: number;
  totals: {
    campusCount: number;
    totalMembers: number;
    totalFundBalance: number;
    totalMonthIncome: number;
  };
  campuses: NetworkCampusRow[];
  headquartersKpis: NetworkChurchKpis;
};

export type NetworkCampusSummary = {
  profile: Record<string, unknown> | null;
  kpis: NetworkChurchKpis;
};

type RpcEnvelope<T> = {
  success?: boolean;
  status_code?: number;
  message?: string;
} & T;

function parseKpis(raw: unknown, churchId: number): NetworkChurchKpis {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    churchId,
    memberCount: Number(row.member_count ?? 0) || 0,
    fundBalance: Number(row.fund_balance ?? 0) || 0,
    monthIncome: Number(row.month_income ?? 0) || 0,
  };
}

function parseCampusRow(raw: unknown): NetworkCampusRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;

  return {
    id,
    name: String(row.name ?? ""),
    shortName:
      typeof row.short_name === "string" && row.short_name.length > 0
        ? row.short_name
        : null,
    slug: String(row.slug ?? ""),
    city:
      typeof row.city === "string" && row.city.length > 0 ? row.city : null,
    churchKind: String(row.church_kind ?? "campus"),
    parentChurchId:
      row.parent_church_id == null
        ? null
        : Number.parseInt(String(row.parent_church_id), 10) || null,
    kpis: parseKpis(row.kpis, id),
  };
}

function assertRpcSuccess(data: RpcEnvelope<unknown> | null, fallback: string) {
  if (!data?.success) {
    throw new Error(
      typeof data?.message === "string" ? data.message : fallback,
    );
  }
}

export async function fetchNetworkDashboard(
  supabase: SupabaseClient,
  headquartersId: number,
): Promise<NetworkDashboardPayload> {
  const { data, error } = await supabase.rpc("sp_get_network_dashboard", {
    p_church_id: headquartersId,
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<{
    headquarters_id?: number;
    totals?: Record<string, unknown>;
    campuses?: unknown[];
    headquarters_kpis?: unknown;
  }>;
  assertRpcSuccess(envelope, "No se pudo cargar la red de iglesias.");

  const campuses = (envelope.campuses ?? [])
    .map(parseCampusRow)
    .filter((row): row is NetworkCampusRow => row != null);

  const totalsRaw = envelope.totals ?? {};
  return {
    headquartersId: Number(envelope.headquarters_id ?? headquartersId),
    totals: {
      campusCount: Number(totalsRaw.campus_count ?? campuses.length) || 0,
      totalMembers: Number(totalsRaw.total_members ?? 0) || 0,
      totalFundBalance: Number(totalsRaw.total_fund_balance ?? 0) || 0,
      totalMonthIncome: Number(totalsRaw.total_month_income ?? 0) || 0,
    },
    campuses,
    headquartersKpis: parseKpis(envelope.headquarters_kpis, headquartersId),
  };
}

export async function fetchNetworkCampusSummary(
  supabase: SupabaseClient,
  headquartersId: number,
  childChurchId: number,
): Promise<NetworkCampusSummary> {
  const { data, error } = await supabase.rpc("sp_get_network_church_summary", {
    p_parent_church_id: headquartersId,
    p_child_church_id: childChurchId,
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<{
    profile?: Record<string, unknown>;
    kpis?: unknown;
  }>;
  assertRpcSuccess(envelope, "No se pudo cargar el detalle de la sucursal.");

  return {
    profile: envelope.profile ?? null,
    kpis: parseKpis(envelope.kpis, childChurchId),
  };
}

export async function fetchNetworkCampuses(
  supabase: SupabaseClient,
  headquartersId: number,
): Promise<NetworkCampusRow[]> {
  const { data, error } = await supabase.rpc("sp_list_network_churches", {
    p_parent_church_id: headquartersId,
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<{ items?: unknown[] }>;
  assertRpcSuccess(envelope, "No se pudo listar las sucursales.");

  return (envelope.items ?? [])
    .map(parseCampusRow)
    .filter((row): row is NetworkCampusRow => row != null);
}
