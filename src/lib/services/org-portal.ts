import type { SupabaseClient } from "@supabase/supabase-js";

export type OrgChurchRow = {
  id: number;
  name: string;
  shortName: string | null;
  city: string | null;
  slug: string;
  externalCode: string | null;
  presbyteryName: string | null;
  churchKind: string;
  orgUnitId: number | null;
  orgUnitName: string | null;
};

export type OrgSubmittedReportRow = {
  id: string;
  churchId: number;
  churchName: string;
  externalCode: string | null;
  periodYear: number;
  periodMonth: number;
  reportKind: string;
  submittedAt: string;
  payload: Record<string, unknown>;
};

export type OrgDashboardPayload = {
  totals: {
    churchCount: number;
    reportCount: number;
  };
  recentReports: Array<{
    id: string;
    churchId: number;
    churchName: string;
    periodYear: number;
    periodMonth: number;
    reportKind: string;
    submittedAt: string;
  }>;
};

type RpcEnvelope<T> = {
  success?: boolean;
  status_code?: number;
  message?: string;
} & T;

function assertRpcSuccess(data: RpcEnvelope<unknown> | null, fallback: string) {
  if (!data?.success) {
    throw new Error(
      typeof data?.message === "string" ? data.message : fallback,
    );
  }
}

function parseChurchRow(raw: unknown): OrgChurchRow | null {
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
    city:
      typeof row.city === "string" && row.city.length > 0 ? row.city : null,
    slug: String(row.slug ?? ""),
    externalCode:
      typeof row.external_code === "string" && row.external_code.length > 0
        ? row.external_code
        : null,
    presbyteryName:
      typeof row.presbytery_name === "string" && row.presbytery_name.length > 0
        ? row.presbytery_name
        : null,
    churchKind: String(row.church_kind ?? "standalone"),
    orgUnitId:
      row.org_unit_id == null
        ? null
        : Number.parseInt(String(row.org_unit_id), 10) || null,
    orgUnitName:
      typeof row.org_unit_name === "string" && row.org_unit_name.length > 0
        ? row.org_unit_name
        : null,
  };
}

function parseReportRow(raw: unknown): OrgSubmittedReportRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id ?? "");
  if (!id) return null;
  return {
    id,
    churchId: Number(row.church_id ?? 0) || 0,
    churchName: String(row.church_name ?? ""),
    externalCode:
      typeof row.external_code === "string" && row.external_code.length > 0
        ? row.external_code
        : null,
    periodYear: Number(row.period_year ?? 0) || 0,
    periodMonth: Number(row.period_month ?? 0) || 0,
    reportKind: String(row.report_kind ?? "concilio_f001"),
    submittedAt: String(row.submitted_at ?? ""),
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {},
  };
}

export async function fetchOrgChurches(
  supabase: SupabaseClient,
  organizationId: number,
  orgUnitId?: number | null,
): Promise<OrgChurchRow[]> {
  const { data, error } = await supabase.rpc("sp_list_org_churches", {
    p_org_id: organizationId,
    p_unit_id: orgUnitId ?? null,
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<{ items?: unknown[] }>;
  assertRpcSuccess(envelope, "No se pudo listar las iglesias del concilio.");

  return (envelope.items ?? [])
    .map(parseChurchRow)
    .filter((row): row is OrgChurchRow => row != null);
}

export async function fetchOrgDashboard(
  supabase: SupabaseClient,
  organizationId: number,
): Promise<OrgDashboardPayload> {
  const { data, error } = await supabase.rpc("sp_get_org_dashboard", {
    p_org_id: organizationId,
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<{
    totals?: Record<string, unknown>;
    recent_reports?: unknown[];
  }>;
  assertRpcSuccess(envelope, "No se pudo cargar el dashboard del concilio.");

  const totals = envelope.totals ?? {};
  const recent = (envelope.recent_reports ?? [])
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        churchId: Number(row.church_id ?? 0) || 0,
        churchName: String(row.church_name ?? ""),
        periodYear: Number(row.period_year ?? 0) || 0,
        periodMonth: Number(row.period_month ?? 0) || 0,
        reportKind: String(row.report_kind ?? "concilio_f001"),
        submittedAt: String(row.submitted_at ?? ""),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null && row.id !== "");

  return {
    totals: {
      churchCount: Number(totals.church_count ?? 0) || 0,
      reportCount: Number(totals.report_count ?? 0) || 0,
    },
    recentReports: recent,
  };
}

export async function fetchOrgSubmittedReports(
  supabase: SupabaseClient,
  organizationId: number,
  filters?: { periodYear?: number; periodMonth?: number },
): Promise<OrgSubmittedReportRow[]> {
  const { data, error } = await supabase.rpc("sp_list_org_submitted_reports", {
    p_org_id: organizationId,
    p_period_year: filters?.periodYear ?? null,
    p_period_month: filters?.periodMonth ?? null,
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<{ items?: unknown[] }>;
  assertRpcSuccess(envelope, "No se pudo listar los reportes recibidos.");

  return (envelope.items ?? [])
    .map(parseReportRow)
    .filter((row): row is OrgSubmittedReportRow => row != null);
}

export async function submitConcilioReport(
  supabase: SupabaseClient,
  input: {
    churchId: number;
    periodYear: number;
    periodMonth: number;
    payload: Record<string, unknown>;
    reportKind?: string;
  },
): Promise<string> {
  const { data, error } = await supabase.rpc("sp_submit_concilio_report", {
    p_church_id: input.churchId,
    p_period_year: input.periodYear,
    p_period_month: input.periodMonth,
    p_payload: input.payload,
    p_report_kind: input.reportKind ?? "concilio_f001",
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<{ report_id?: string }>;
  assertRpcSuccess(envelope, "No se pudo enviar el reporte al concilio.");
  return String(envelope.report_id ?? "");
}
