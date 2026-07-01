"use client";

import {
  saveAdminUserAction,
  type AdminUserActionResult,
} from "@/app/(app)/settings/users/actions";
import { Icons } from "@/components/icons";
import { CrudSwitch } from "@/components/ui/crud-switch";
import { PROJECT_USER_ROLES } from "@/lib/admin-users/roles";
import type { AdminUserRow } from "@/lib/admin-users/types";
import { toast } from "@/lib/toast";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  startTransition,
} from "react";

const initial: AdminUserActionResult | null = null;

type FieldDef = {
  key: keyof FormValues;
  label: string;
  type: "text" | "email" | "select" | "switch";
  required?: boolean;
  placeholder?: string;
  hint?: string;
};

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  active: boolean;
};

const FIELDS: FieldDef[] = [
  {
    key: "firstName",
    label: "Nombre",
    type: "text",
    required: true,
    placeholder: "Roberto",
  },
  {
    key: "lastName",
    label: "Apellido",
    type: "text",
    required: true,
    placeholder: "Almonte",
  },
  {
    key: "email",
    label: "Correo electrónico",
    type: "email",
    required: true,
    placeholder: "usuario@iglesia.do",
  },
  {
    key: "role",
    label: "Rol",
    type: "select",
    required: true,
  },
  {
    key: "active",
    label: "Cuenta activa",
    type: "switch",
    hint: "Si está inactiva, el usuario no podrá iniciar sesión",
  },
];

function FieldRow({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: string | boolean;
  error?: string;
  onChange: (v: string | boolean) => void;
}) {
  if (field.type === "switch") {
    return (
      <div
        className="row between"
        style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}
      >
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{field.label}</div>
          {field.hint ? <div className="tiny muted">{field.hint}</div> : null}
        </div>
        <CrudSwitch on={!!value} onChange={(v) => onChange(v)} />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="field">
        <label>
          {field.label}
          {field.required ? (
            <span style={{ color: "var(--danger)" }}> *</span>
          ) : null}
        </label>
        <div className={`input-wrap ${error ? "error" : ""}`}>
          <select
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="" disabled>
              Seleccionar…
            </option>
            {PROJECT_USER_ROLES.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        {error ? <div className="help error">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="field">
      <label>
        {field.label}
        {field.required ? (
          <span style={{ color: "var(--danger)" }}> *</span>
        ) : null}
      </label>
      <div className={`input-wrap ${error ? "error" : ""}`}>
        <input
          type={field.type}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error ? <div className="help error">{error}</div> : null}
    </div>
  );
}

export function AdminUserFormDrawer({
  open,
  mode,
  user,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "new" | "edit";
  user: AdminUserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveAdminUserAction, initial);
  const [vals, setVals] = useState<FormValues>({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    active: true,
  });
  const [errs, setErrs] = useState<Partial<Record<keyof FormValues, string>>>({});

  useEffect(() => {
    if (!open) return;
    setVals({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "",
      active: user?.active ?? true,
    });
    setErrs({});
  }, [open, user, mode]);

  const handledRef = useRef<AdminUserActionResult | null>(null);

  useEffect(() => {
    if (!open) handledRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!state || state === handledRef.current) return;
    handledRef.current = state;

    if (state.ok) {
      if (state.tempPassword) {
        toast.success(
          "Usuario creado",
          `${vals.email} ya puede iniciar sesión. Contraseña temporal: ${state.tempPassword}`,
        );
      } else {
        toast.success(
          mode === "new" ? "Usuario creado" : "Usuario actualizado",
          mode === "new"
            ? `${vals.email} ya puede iniciar sesión.`
            : `${vals.email} guardado.`,
        );
      }
      onSaved();
      onClose();
    } else {
      toast.error(state.error);
    }
  }, [state, mode, vals.email, onSaved, onClose]);

  if (!open) return null;

  const title = mode === "new" ? "Nuevo usuario" : "Editar";

  const submit = () => {
    const nextErrs: Partial<Record<keyof FormValues, string>> = {};
    for (const f of FIELDS) {
      if (!f.required) continue;
      const v = vals[f.key];
      if (v === "" || v == null) nextErrs[f.key] = "Obligatorio";
    }
    setErrs(nextErrs);
    if (Object.keys(nextErrs).length > 0) return;

    const fd = new FormData();
    fd.set("mode", mode === "new" ? "create" : "update");
    if (user?.authUserId) fd.set("authUserId", user.authUserId);
    if (user?.profileId) fd.set("profileId", user.profileId);
    fd.set("firstName", vals.firstName);
    fd.set("lastName", vals.lastName);
    fd.set("email", vals.email);
    fd.set("roleLabel", vals.role);
    fd.set("isActive", String(vals.active));
    startTransition(() => formAction(fd));
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">
              {mode === "new" ? "Nuevo registro" : "Edición"}
            </div>
            <h2 style={{ margin: "4px 0 0", fontSize: 18 }}>{title}</h2>
          </div>
          <button type="button" className="btn ghost icon-only" onClick={onClose}>
            <Icons.x width={18} />
          </button>
        </div>
        <div className="drawer-body col gap-md">
          {FIELDS.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              value={vals[f.key]}
              error={errs[f.key]}
              onChange={(v) => setVals((s) => ({ ...s, [f.key]: v }))}
            />
          ))}
        </div>
        <div className="drawer-foot">
          <button type="button" className="btn outline" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={pending}
            onClick={submit}
          >
            <Icons.check width={14} />{" "}
            {pending
              ? "Guardando…"
              : mode === "new"
                ? "Crear"
                : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}
