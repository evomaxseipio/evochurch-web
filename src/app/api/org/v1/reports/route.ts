import { parseBearerOrgApiKey } from "@/lib/org/api-key";
import { resolveOrgApiKey } from "@/lib/org/external-api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function authenticateOrgApi(request: Request) {
  const rawKey = parseBearerOrgApiKey(request.headers.get("authorization"));
  if (!rawKey) {
    return {
      error: NextResponse.json(
        { error: "Authorization Bearer con clave org requerida." },
        { status: 401 },
      ),
    };
  }

  const resolved = await resolveOrgApiKey(rawKey);
  if (!resolved || !resolved.scopes.includes("read")) {
    return {
      error: NextResponse.json(
        { error: "Clave API no autorizada." },
        { status: 401 },
      ),
    };
  }

  return { organizationId: resolved.organizationId };
}

export async function GET(request: Request) {
  const auth = await authenticateOrgApi(request);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const periodYearRaw = url.searchParams.get("periodYear");
  const periodMonthRaw = url.searchParams.get("periodMonth");
  const periodYear =
    periodYearRaw != null ? Number.parseInt(periodYearRaw, 10) : null;
  const periodMonth =
    periodMonthRaw != null ? Number.parseInt(periodMonthRaw, 10) : null;

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "API del concilio no configurada en el servidor." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase.rpc("sp_org_api_list_reports", {
    p_org_id: auth.organizationId,
    p_period_year: Number.isFinite(periodYear) ? periodYear : null,
    p_period_month: Number.isFinite(periodMonth) ? periodMonth : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const envelope = data as { success?: boolean; items?: unknown[]; message?: string };
  if (!envelope?.success) {
    return NextResponse.json(
      { error: envelope?.message ?? "No se pudo listar reportes." },
      { status: 500 },
    );
  }

  return NextResponse.json({ items: envelope.items ?? [] });
}
