"use client";

import {
  createChurchRoleAction,
  updateChurchRoleAction,
  type CreateRoleActionResult,
  type UpdateRoleActionResult,
} from "@/app/(app)/settings/roles/actions";
import { Icons } from "@/components/icons";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ChurchRolePermissions } from "@/lib/roles/types";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, startTransition } from "react";

type FormValues = {
  name: string;
  description: string;
};

function roleToFormValues(role: ChurchRolePermissions | null): FormValues {
  return {
    name: role?.appRoleName ?? "",
    description: role?.description ?? "",
  };
}

export function RoleFormDrawer({
  mode,
  role,
  open,
  onClose,
  onCreated,
}: {
  mode: "new" | "edit";
  role?: ChurchRolePermissions | null;
  open: boolean;
  onClose: () => void;
  onCreated?: (appRoleId: number) => void;
}) {
  const router = useRouter();
  const createInitial: CreateRoleActionResult | null = null;
  const updateInitial: UpdateRoleActionResult | null = null;
  const [createState, createAction, createPending] = useActionState(
    createChurchRoleAction,
    createInitial,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateChurchRoleAction,
    updateInitial,
  );
  const pending = mode === "new" ? createPending : updatePending;
  const state = mode === "new" ? createState : updateState;

  const [values, setValues] = useState<FormValues>(() => roleToFormValues(role ?? null));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setValues(roleToFormValues(role ?? null));
    setErrors({});
  }, [open, role]);

  useActionToast(state, {
    successMessage:
      mode === "new"
        ? "Rol creado correctamente."
        : "Rol actualizado correctamente.",
    onSuccess: () => {
      if (mode === "new" && createState?.ok === true) {
        onCreated?.(createState.appRoleId);
      }
      onClose();
      router.refresh();
    },
  });

  if (!open) return null;

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = "Obligatorio";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const formData = new FormData();
    formData.set("name", values.name.trim());
    formData.set("description", values.description.trim());
    if (mode === "edit" && role) {
      formData.set("appRoleId", String(role.appRoleId));
      if (role.roleKind) formData.set("roleKind", role.roleKind);
    }

    startTransition(() => {
      if (mode === "new") createAction(formData);
      else updateAction(formData);
    });
  }

  return (
    <>
      <div
        className="drawer-backdrop"
        onClick={pending ? undefined : onClose}
      />
      <div className="drawer" role="dialog" aria-labelledby="role-form-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">
              {mode === "new" ? "Nuevo rol" : "Editar rol"}
            </div>
            <h2 id="role-form-title" style={{ margin: "4px 0 0", fontSize: 18 }}>
              {mode === "new"
                ? "Crear rol personalizado"
                : "Editar rol personalizado"}
            </h2>
          </div>
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={onClose}
            disabled={pending}
            aria-label="Cerrar"
          >
            <Icons.x size={18} />
          </button>
        </div>

        <div className="drawer-body col gap-md">
          {mode === "new" ? (
            <p className="muted tiny" style={{ margin: 0, lineHeight: 1.5 }}>
              El rol quedará disponible solo para tu iglesia. Después podrás
              asignar permisos en la matriz.
            </p>
          ) : null}

          <div className="field">
            <label>
              Nombre del rol{" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <div className={`input-wrap${errors.name ? " error" : ""}`}>
              <input
                value={values.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Ej. Coordinador de eventos"
                maxLength={120}
                autoFocus
              />
            </div>
            {errors.name ? (
              <span className="field-error">{errors.name}</span>
            ) : null}
          </div>

          <div className="field">
            <label>Descripción</label>
            <div
              className="input-wrap"
              style={{ alignItems: "flex-start", padding: "10px 12px" }}
            >
              <textarea
                rows={3}
                value={values.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="¿Qué funciones cumple este rol en la iglesia?"
                style={{ resize: "vertical", minHeight: 72 }}
                maxLength={500}
              />
            </div>
          </div>
        </div>

        <div
          className="drawer-foot row"
          style={{ gap: 10, justifyContent: "flex-end" }}
        >
          <button
            type="button"
            className="btn outline"
            onClick={onClose}
            disabled={pending}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={pending}
          >
            {pending
              ? mode === "new"
                ? "Creando…"
                : "Guardando…"
              : mode === "new"
                ? "Crear rol"
                : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}
