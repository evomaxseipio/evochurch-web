"use server";

import { getOrgActionSession, orgHasPermission } from "@/lib/auth/org-session";
import { provisionChurchUnderOrg } from "@/lib/services/org-portal";
import { revalidatePath } from "next/cache";

export type ProvisionChurchResult =
  | { ok: true; churchId: number }
  | { ok: false; error: string };

export async function provisionChurchAction(
  formData: FormData,
): Promise<ProvisionChurchResult> {
  try {
    const { supabase, session } = await getOrgActionSession();
    if (!orgHasPermission(session, "org:churches:provision")) {
      return { ok: false, error: "Sin permiso para dar de alta iglesias." };
    }

    const churchId = await provisionChurchUnderOrg(supabase, session.organizationId, {
      name: String(formData.get("name") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
      shortName: String(formData.get("shortName") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      externalCode: String(formData.get("externalCode") ?? "").trim(),
      presbyteryName: String(formData.get("presbyteryName") ?? "").trim(),
    });

    revalidatePath("/org/churches");
    return { ok: true, churchId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo dar de alta la iglesia.",
    };
  }
}
