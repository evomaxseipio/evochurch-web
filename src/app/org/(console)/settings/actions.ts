"use server";

import { getOrgActionSession, orgHasPermission } from "@/lib/auth/org-session";
import { generateOrgApiKey } from "@/lib/org/api-key";
import {
  createOrgApiKey,
  revokeOrgApiKey,
} from "@/lib/services/org-portal";
import { revalidatePath } from "next/cache";

export type CreateApiKeyResult =
  | { ok: true; rawKey: string }
  | { ok: false; error: string };

export async function createOrgApiKeyAction(
  label: string,
): Promise<CreateApiKeyResult> {
  try {
    const { supabase, session } = await getOrgActionSession();
    if (!orgHasPermission(session, "org:api:manage")) {
      return { ok: false, error: "Sin permiso para gestionar claves API." };
    }

    const generated = generateOrgApiKey();
    await createOrgApiKey(supabase, session.organizationId, {
      label: label.trim() || "Default",
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
    });

    revalidatePath("/org/settings");
    return { ok: true, rawKey: generated.rawKey };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo crear la clave API.",
    };
  }
}

export type RevokeApiKeyResult = { ok: true } | { ok: false; error: string };

export async function revokeOrgApiKeyAction(
  keyId: string,
): Promise<RevokeApiKeyResult> {
  try {
    const { supabase, session } = await getOrgActionSession();
    if (!orgHasPermission(session, "org:api:manage")) {
      return { ok: false, error: "Sin permiso para gestionar claves API." };
    }

    await revokeOrgApiKey(supabase, session.organizationId, keyId);
    revalidatePath("/org/settings");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo revocar la clave API.",
    };
  }
}
