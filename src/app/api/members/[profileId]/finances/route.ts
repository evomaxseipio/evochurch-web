import { getAppSession } from "@/lib/auth/app-session";
import { hasPermission } from "@/lib/auth/permissions";
import {
  emptyMemberFinanceData,
  fetchMemberFinancePayload,
} from "@/lib/services/member-finances";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await context.params;
  if (!profileId) {
    return NextResponse.json(
      { error: "ID de miembro requerido." },
      { status: 400 },
    );
  }

  const session = await getAppSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }
  if (!hasPermission(session, "finances:contributions:read")) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const supabase = await createClient();

  try {
    const finances = await fetchMemberFinancePayload(
      supabase,
      session.churchId,
      profileId,
    );
    return NextResponse.json(finances);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Error al cargar finanzas del miembro.";
    return NextResponse.json(
      emptyMemberFinanceData(message),
      { status: 200 },
    );
  }
}
