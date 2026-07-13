"use server";

import { getActionSessionWith } from "@/lib/auth/permissions-server";
import {
  fetchNetworkCampusSummary,
  type NetworkCampusSummary,
} from "@/lib/services/church-network";

export type CampusSummaryActionResult =
  | { ok: true; summary: NetworkCampusSummary }
  | { ok: false; error: string };

export async function loadCampusSummaryAction(
  childChurchId: number,
): Promise<CampusSummaryActionResult> {
  const { supabase, session } = await getActionSessionWith(
    "network:churches:read",
  );

  if (session.churchKind !== "headquarters") {
    return { ok: false, error: "Solo las sedes pueden consultar sucursales." };
  }

  try {
    const summary = await fetchNetworkCampusSummary(
      supabase,
      session.churchId,
      childChurchId,
    );
    return { ok: true, summary };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo cargar el detalle.",
    };
  }
}
