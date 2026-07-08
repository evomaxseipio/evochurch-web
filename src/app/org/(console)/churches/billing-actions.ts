"use server";

import { getOrgActionSession, orgHasPermission } from "@/lib/auth/org-session";
import { updateChurchBilling } from "@/lib/services/org-portal";
import { revalidatePath } from "next/cache";

export type UpdateBillingResult = { ok: true } | { ok: false; error: string };

export async function updateChurchBillingAction(
  churchId: number,
  input: { billingPlan?: string; billingStatus?: string },
): Promise<UpdateBillingResult> {
  try {
    const { supabase, session } = await getOrgActionSession();
    if (!orgHasPermission(session, "org:billing:write")) {
      return { ok: false, error: "Sin permiso para editar facturación." };
    }

    await updateChurchBilling(supabase, session.organizationId, churchId, input);
    revalidatePath("/org/churches");
    revalidatePath("/org/dashboard");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo actualizar la facturación.",
    };
  }
}
