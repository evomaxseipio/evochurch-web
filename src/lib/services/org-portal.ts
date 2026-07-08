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
  billingPlan: string;
  billingStatus: string;
};

export type OrgApiKeyRow = {
  id: string;
  label: string;
  keyPrefix: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export type OrgOverdueChurchRow = {
  churchId: number;
  churchName: string;
  externalCode: string | null;
  billingStatus: string;
  periodYear: number;
  periodMonth: number;
  dueDay: number;
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
    overdueCount: number;
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
  overdueChurches: OrgOverdueChurchRow[];
  overduePeriod: {
    year: number;
    month: number;
    dueDay: number;
  };
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
    billingPlan: String(row.billing_plan ?? "standard"),
    billingStatus: String(row.billing_status ?? "active"),
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
    overdue_churches?: unknown[];
    overdue_period?: Record<string, unknown>;
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

  const overdue = (envelope.overdue_churches ?? [])
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;
      return {
        churchId: Number(row.church_id ?? 0) || 0,
        churchName: String(row.church_name ?? ""),
        externalCode:
          typeof row.external_code === "string" && row.external_code.length > 0
            ? row.external_code
            : null,
        billingStatus: String(row.billing_status ?? "active"),
        periodYear: Number(row.period_year ?? 0) || 0,
        periodMonth: Number(row.period_month ?? 0) || 0,
        dueDay: Number(row.due_day ?? 10) || 10,
      };
    })
    .filter((row): row is OrgOverdueChurchRow => row != null && row.churchId > 0);

  const period = envelope.overdue_period ?? {};

  return {
    totals: {
      churchCount: Number(totals.church_count ?? 0) || 0,
      reportCount: Number(totals.report_count ?? 0) || 0,
      overdueCount: Number(totals.overdue_count ?? overdue.length) || 0,
    },
    recentReports: recent,
    overdueChurches: overdue,
    overduePeriod: {
      year: Number(period.year ?? 0) || 0,
      month: Number(period.month ?? 0) || 0,
      dueDay: Number(period.due_day ?? 10) || 10,
    },
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

export async function provisionChurchUnderOrg(
  supabase: SupabaseClient,
  organizationId: number,
  input: {
    name: string;
    slug: string;
    shortName?: string;
    city?: string;
    externalCode?: string;
    presbyteryName?: string;
    orgUnitId?: number | null;
    churchKind?: string;
  },
): Promise<number> {
  const { data, error } = await supabase.rpc("sp_provision_church_under_org", {
    p_org_id: organizationId,
    p_payload: {
      name: input.name,
      slug: input.slug,
      short_name: input.shortName ?? "",
      city: input.city ?? "",
      external_code: input.externalCode ?? "",
      presbytery_name: input.presbyteryName ?? "",
      org_unit_id: input.orgUnitId ?? null,
      church_kind: input.churchKind ?? "standalone",
    },
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<{ church_id?: number }>;
  assertRpcSuccess(envelope, "No se pudo dar de alta la iglesia.");

  const churchId = Number(envelope.church_id);
  if (!Number.isFinite(churchId)) {
    throw new Error("No se recibió el ID de la iglesia creada.");
  }
  return churchId;
}

export async function updateChurchBilling(
  supabase: SupabaseClient,
  organizationId: number,
  churchId: number,
  input: { billingPlan?: string; billingStatus?: string },
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_update_church_billing", {
    p_org_id: organizationId,
    p_church_id: churchId,
    p_payload: {
      billing_plan: input.billingPlan ?? "",
      billing_status: input.billingStatus ?? "",
    },
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<unknown>;
  assertRpcSuccess(envelope, "No se pudo actualizar la facturación.");
}

function parseApiKeyRow(raw: unknown): OrgApiKeyRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id ?? "");
  if (!id) return null;
  return {
    id,
    label: String(row.label ?? ""),
    keyPrefix: String(row.key_prefix ?? ""),
    createdAt: String(row.created_at ?? ""),
    revokedAt:
      typeof row.revoked_at === "string" && row.revoked_at.length > 0
        ? row.revoked_at
        : null,
    lastUsedAt:
      typeof row.last_used_at === "string" && row.last_used_at.length > 0
        ? row.last_used_at
        : null,
  };
}

export async function fetchOrgApiKeys(
  supabase: SupabaseClient,
  organizationId: number,
): Promise<OrgApiKeyRow[]> {
  const { data, error } = await supabase.rpc("sp_list_org_api_keys", {
    p_org_id: organizationId,
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<{ items?: unknown[] }>;
  assertRpcSuccess(envelope, "No se pudo listar las claves API.");

  return (envelope.items ?? [])
    .map(parseApiKeyRow)
    .filter((row): row is OrgApiKeyRow => row != null);
}

export async function createOrgApiKey(
  supabase: SupabaseClient,
  organizationId: number,
  input: { label: string; keyPrefix: string; keyHash: string },
): Promise<string> {
  const { data, error } = await supabase.rpc("sp_create_org_api_key", {
    p_org_id: organizationId,
    p_label: input.label,
    p_key_prefix: input.keyPrefix,
    p_key_hash: input.keyHash,
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<{ key_id?: string }>;
  assertRpcSuccess(envelope, "No se pudo crear la clave API.");
  return String(envelope.key_id ?? "");
}

export async function revokeOrgApiKey(
  supabase: SupabaseClient,
  organizationId: number,
  keyId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("sp_revoke_org_api_key", {
    p_org_id: organizationId,
    p_key_id: keyId,
  });
  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<unknown>;
  assertRpcSuccess(envelope, "No se pudo revocar la clave API.");
}
