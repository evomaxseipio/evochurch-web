"use server";

import { getActionSessionWith } from "@/lib/auth/permissions";
import { isPermissionKey, type PermissionKey } from "@/lib/auth/permission-keys";
import { setChurchRolePermissions } from "@/lib/services/roles";
import { revalidatePath } from "next/cache";

export type RolePermissionsActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setChurchRolePermissionsAction(
  _prev: RolePermissionsActionResult | null,
  formData: FormData,
): Promise<RolePermissionsActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("roles:manage");

    const appRoleIdRaw = formData.get("appRoleId");
    const appRoleId =
      typeof appRoleIdRaw === "string"
        ? Number.parseInt(appRoleIdRaw, 10)
        : NaN;
    if (!Number.isFinite(appRoleId)) {
      return { ok: false, error: "Rol no válido." };
    }

    const keysRaw = formData.get("permissionKeys");
    let keys: PermissionKey[] = [];
    if (typeof keysRaw === "string" && keysRaw.trim()) {
      const parsed = JSON.parse(keysRaw) as unknown;
      if (Array.isArray(parsed)) {
        keys = parsed.filter(
          (k): k is PermissionKey =>
            typeof k === "string" && isPermissionKey(k),
        );
      }
    }

    await setChurchRolePermissions(
      supabase,
      session.churchId,
      appRoleId,
      keys,
    );
    revalidatePath("/settings/roles");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudieron guardar los permisos.",
    };
  }
}
