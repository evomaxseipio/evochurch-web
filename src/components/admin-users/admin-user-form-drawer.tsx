"use client";

import {
  saveAdminUserAction,
  type AdminUserActionResult,
} from "@/app/(app)/settings/users/actions";
import { Icons } from "@/components/icons";
import { CrudSwitch } from "@/components/ui/crud-switch";
import { generateTempPassword } from "@/lib/admin-users/temp-password";
import type { AdminUserRow } from "@/lib/admin-users/types";
import type { AssignableRole } from "@/lib/roles/types";
import { memberFullName } from "@/lib/members/parse";
import type { Member } from "@/lib/members/types";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
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
  roleId: string;
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
    key: "roleId",
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
  assignableRoles = [],
}: {
  field: FieldDef;
  value: string | boolean;
  error?: string;
  onChange: (v: string | boolean) => void;
  assignableRoles?: AssignableRole[];
}) {
  const tAdmin = useTranslations("adminUsers");

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
              {tAdmin("selectRole")}
            </option>
            {assignableRoles.map((r) => (
              <option key={r.appRoleId} value={String(r.appRoleId)}>
                {r.appRoleName}
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
  assignableRoles,
  presetMember = null,
  initialTempPassword = null,
  onClose,
  onSaved,
  onPasswordIssued,
}: {
  open: boolean;
  mode: "new" | "edit";
  user: AdminUserRow | null;
  assignableRoles: AssignableRole[];
  /** Miembro vinculado desde Miembros — identidad readonly, rol editable. */
  presetMember?: Member | null;
  /** Contraseña temporal vigente (solo lectura en edición). */
  initialTempPassword?: string | null;
  onClose: () => void;
  onSaved: () => void;
  onPasswordIssued?: (payload: { email: string; tempPassword: string }) => void;
}) {
  const tAdmin = useTranslations("adminUsers");
  const tCommon = useTranslations("common");
  const lockedMember = presetMember != null;
  const showTempSection =
    mode === "new" || (mode === "edit" && (user?.isTempPassword ?? false));
  const [state, formAction, pending] = useActionState(saveAdminUserAction, initial);
  const [vals, setVals] = useState<FormValues>({
    firstName: "",
    lastName: "",
    email: "",
    roleId: "",
    active: true,
  });
  const [errs, setErrs] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [tempPassword, setTempPassword] = useState("");
  const [showStoredTemp, setShowStoredTemp] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVals({
      firstName: presetMember?.firstName ?? user?.firstName ?? "",
      lastName: presetMember?.lastName ?? user?.lastName ?? "",
      email: presetMember?.contact.email ?? user?.email ?? "",
      roleId:
        user?.appRoleId != null ? String(user.appRoleId) : "",
      active: user?.active ?? true,
    });
    setTempPassword("");
    setShowStoredTemp(false);
    setErrs({});
  }, [open, user, mode, presetMember]);

  const handledRef = useRef<AdminUserActionResult | null>(null);

  useEffect(() => {
    if (!open) handledRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!state || state === handledRef.current) return;
    handledRef.current = state;

    if (state.ok) {
      if (state.tempPassword && onPasswordIssued) {
        onPasswordIssued({
          email: state.email ?? vals.email,
          tempPassword: state.tempPassword,
        });
      } else {
        toast.success(
          mode === "new" ? tAdmin("userCreated") : tAdmin("userUpdated"),
          `${vals.email} guardado correctamente.`,
        );
      }
      onSaved();
      onClose();
    } else {
      toast.error(state.error);
    }
  }, [state, mode, vals.email, onSaved, onClose, onPasswordIssued, tAdmin]);

  if (!open) return null;

  const title = lockedMember
    ? mode === "new"
      ? "Dar acceso al sistema"
      : "Editar acceso"
    : mode === "new"
      ? "Nuevo usuario"
      : "Editar";

  const submit = () => {
    const nextErrs: Partial<Record<keyof FormValues, string>> = {};
    for (const f of FIELDS) {
      if (lockedMember && (f.key === "firstName" || f.key === "lastName")) {
        continue;
      }
      if (!f.required) continue;
      const v = vals[f.key];
      if (v === "" || v == null) nextErrs[f.key] = tCommon("required");
    }
    setErrs(nextErrs);
    if (Object.keys(nextErrs).length > 0) return;

    const fd = new FormData();
    fd.set("mode", mode === "new" ? "create" : "update");
    if (user?.authUserId) fd.set("authUserId", user.authUserId);
    const profileId = presetMember?.memberId ?? user?.profileId;
    if (profileId) fd.set("profileId", profileId);
    fd.set("firstName", vals.firstName);
    fd.set("lastName", vals.lastName);
    fd.set("email", vals.email);
    const selectedRole = assignableRoles.find(
      (r) => String(r.appRoleId) === vals.roleId,
    );
    fd.set("appRoleId", vals.roleId);
    fd.set("roleLabel", selectedRole?.appRoleName ?? "");
    if (selectedRole?.roleKey) fd.set("roleKey", selectedRole.roleKey);
    fd.set("isActive", String(vals.active));
    if (tempPassword.trim()) fd.set("password", tempPassword.trim());
    startTransition(() => formAction(fd));
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">
              {lockedMember
                ? "Acceso · Miembro"
                : mode === "new"
                  ? "Nuevo registro"
                  : "Edición"}
            </div>
            <h2 style={{ margin: "4px 0 0", fontSize: 18 }}>{title}</h2>
          </div>
          <button type="button" className="btn ghost icon-only" onClick={onClose}>
            <Icons.x width={18} />
          </button>
        </div>
        <div className="drawer-body col gap-md">
          {lockedMember ? (
            <div className="field">
              <label>Miembro</label>
              <div className="card flat" style={{ padding: 14 }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="chip">
                    <span className="pip" /> Miembro bautizado
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {memberFullName(presetMember)}
                  </span>
                </div>
                <div className="help" style={{ marginTop: 6 }}>
                  El acceso quedará vinculado a este perfil.
                </div>
              </div>
            </div>
          ) : null}
          {FIELDS.map((f) => {
            if (lockedMember && (f.key === "firstName" || f.key === "lastName")) {
              return null;
            }
            return (
            <FieldRow
              key={f.key}
              field={f}
              value={vals[f.key]}
              error={errs[f.key]}
              assignableRoles={assignableRoles}
              onChange={(v) => setVals((s) => ({ ...s, [f.key]: v }))}
            />
            );
          })}
          {showTempSection ? (
            <div className="field">
              <label>
                {mode === "new" ? "Contraseña temporal" : "Nueva contraseña temporal"}
              </label>
              {mode === "edit" && user?.isTempPassword && initialTempPassword ? (
                <div className="card flat" style={{ padding: 12, marginBottom: 10 }}>
                  <div className="row between" style={{ gap: 10, alignItems: "center" }}>
                    <div>
                      <div className="tiny muted">Temporal activa</div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 14,
                          fontWeight: 600,
                          marginTop: 4,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {showStoredTemp ? initialTempPassword : "••••••••••••"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn outline sm"
                      onClick={() => setShowStoredTemp((v) => !v)}
                    >
                      {showStoredTemp ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="row" style={{ gap: 8 }}>
                <div className="input-wrap" style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={tempPassword}
                    placeholder={
                      mode === "new"
                        ? "Vacío = generar automáticamente"
                        : "Dejar vacío para no cambiar"
                    }
                    onChange={(e) => setTempPassword(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => setTempPassword(generateTempPassword())}
                >
                  Generar
                </button>
              </div>
              <div className="help">
                {mode === "new"
                  ? "Se marcará como temporal hasta que el hermano la cambie al iniciar sesión."
                  : "Si defines una nueva, reemplaza la temporal anterior."}
              </div>
            </div>
          ) : null}
        </div>
        <div className="drawer-foot">
          <button type="button" className="btn outline" onClick={onClose}>
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={pending}
            onClick={submit}
          >
            <Icons.check width={14} />{" "}
            {pending
              ? tCommon("saving")
              : mode === "new"
                ? lockedMember
                  ? "Crear acceso"
                  : "Crear"
                : tCommon("saveChanges")}
          </button>
        </div>
      </div>
    </>
  );
}
