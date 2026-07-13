"use server";
import { churchPath } from "@/lib/apps/church-routes";

import { getActionSessionWith } from "@/lib/auth/permissions-server";
import { isPermissionKey, type PermissionKey } from "@/lib/auth/permission-keys";
import { isSystemLockedRole } from "@/lib/roles/keys";
import { parseRoleKind } from "@/lib/roles/role-config";
import { sanitizePermissionDraftForSave } from "@/lib/roles/catalog";
import {
  createChurchRole,
  deactivateChurchRole,
  setChurchRolePermissions,
  updateChurchRole,
} from "@/lib/services/roles";
import { revalidatePath } from "next/cache";

export type RolePermissionsActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type CreateRoleActionResult =
  | { ok: true; appRoleId: number }
  | { ok: false; error: string };

export type UpdateRoleActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type DeactivateRoleActionResult =
  | { ok: true }
  | { ok: false; error: string };

function roleKindFromForm(formData: FormData) {
  return parseRoleKind(String(formData.get("roleKind") ?? ""));
}

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
    if (isSystemLockedRole({ roleKind: roleKindFromForm(formData) })) {
      return {
        ok: false,
        error: "Los roles del sistema no se pueden modificar.",
      };
    }

    const keysRaw = formData.get("permissionKeys");
    let keys: PermissionKey[] = [];
    if (typeof keysRaw === "string" && keysRaw.trim()) {
      const parsed = JSON.parse(keysRaw) as unknown;
      if (Array.isArray(parsed)) {
        keys = sanitizePermissionDraftForSave(
          parsed.filter(
            (k): k is PermissionKey =>
              typeof k === "string" && isPermissionKey(k),
          ),
        );
      }
    }

    await setChurchRolePermissions(
      supabase,
      session.churchId,
      appRoleId,
      keys,
    );
    revalidatePath(churchPath("/settings/roles"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudieron guardar los permisos.",
    };
  }
}

export async function createChurchRoleAction(
  _prev: CreateRoleActionResult | null,
  formData: FormData,
): Promise<CreateRoleActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("roles:manage");

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) {
      return { ok: false, error: "El nombre del rol es obligatorio." };
    }
    if (name.length > 120) {
      return { ok: false, error: "El nombre no puede superar 120 caracteres." };
    }
    if (description.length > 500) {
      return {
        ok: false,
        error: "La descripción no puede superar 500 caracteres.",
      };
    }

    const created = await createChurchRole(supabase, session.churchId, {
      name,
      description,
    });
    revalidatePath(churchPath("/settings/roles"));
    return { ok: true, appRoleId: created.appRoleId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo crear el rol.",
    };
  }
}

export async function updateChurchRoleAction(
  _prev: UpdateRoleActionResult | null,
  formData: FormData,
): Promise<UpdateRoleActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("roles:manage");

    const appRoleId = Number.parseInt(String(formData.get("appRoleId") ?? ""), 10);
    if (!Number.isFinite(appRoleId)) {
      return { ok: false, error: "Rol no válido." };
    }
    if (isSystemLockedRole({ roleKind: roleKindFromForm(formData) })) {
      return {
        ok: false,
        error: "Los roles del sistema no se pueden modificar.",
      };
    }

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) {
      return { ok: false, error: "El nombre del rol es obligatorio." };
    }
    if (name.length > 120) {
      return { ok: false, error: "El nombre no puede superar 120 caracteres." };
    }
    if (description.length > 500) {
      return {
        ok: false,
        error: "La descripción no puede superar 500 caracteres.",
      };
    }

    await updateChurchRole(supabase, session.churchId, appRoleId, {
      name,
      description,
    });
    revalidatePath(churchPath("/settings/roles"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo actualizar el rol.",
    };
  }
}

export async function deactivateChurchRoleAction(
  _prev: DeactivateRoleActionResult | null,
  formData: FormData,
): Promise<DeactivateRoleActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("roles:manage");

    const appRoleId = Number.parseInt(String(formData.get("appRoleId") ?? ""), 10);
    if (!Number.isFinite(appRoleId)) {
      return { ok: false, error: "Rol no válido." };
    }

    await deactivateChurchRole(supabase, session.churchId, appRoleId);
    revalidatePath(churchPath("/settings/roles"));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo inactivar el rol.",
    };
  }
}
