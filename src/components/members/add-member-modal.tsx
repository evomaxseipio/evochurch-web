"use client";

import {
  createMemberAction,
  type ActionResult,
} from "@/app/(app)/members/actions";
import { Icons } from "@/components/icons";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  GENDER_OPTIONS,
  ID_TYPE_OPTIONS,
  MARITAL_OPTIONS,
  type SelectOption,
} from "@/lib/members/catalogs";
import { useActionState, useEffect, useState } from "react";
import { toast } from "@/lib/toast";

const initial: ActionResult | null = null;

const NATIONALITY_OPTIONS = [
  "Dominicano/a",
  "Haitiano/a",
  "Venezolano/a",
  "Estados Unidos",
  "Colombiano/a",
  "Otro",
] as const;

const COUNTRY_OPTIONS = [
  "República Dominicana",
  "Estados Unidos",
  "España",
  "Puerto Rico",
  "Otro",
] as const;

export function AddMemberModal({
  open,
  onClose,
  roles: _roles,
}: {
  open: boolean;
  onClose: () => void;
  roles: string[];
}) {
  const [state, formAction, pending] = useActionState(createMemberAction, initial);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
    }
  }, [open]);

  useActionToast(state, {
    successMessage: "Miembro agregado correctamente.",
    onSuccess: onClose,
  });

  if (!open) return null;

  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const initials = fullName
    ? fullName
        .split(/\s+/)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("")
    : "??";

  return (
    <>
      <div
        className="drawer-backdrop"
        onClick={pending ? undefined : onClose}
        aria-hidden
      />
      <div className="drawer" role="dialog" aria-labelledby="add-member-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Nuevo registro</div>
            <div
              id="add-member-title"
              className="display"
              style={{ fontSize: 24, marginTop: 2 }}
            >
              Agregar miembro
            </div>
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

        <form
          action={formAction}
          className="col"
          style={{ flex: 1, minHeight: 0 }}
          onSubmit={(e) => {
            const form = e.currentTarget;
            const phone = String(new FormData(form).get("phone") ?? "").trim();
            if (!firstName.trim() || !lastName.trim()) {
              e.preventDefault();
              toast.error("Campos requeridos", "Nombre y apellido son obligatorios.");
              return;
            }
            if (!phone) {
              e.preventDefault();
              toast.error("Campos requeridos", "El teléfono es obligatorio.");
            }
          }}
        >
          <div className="drawer-body col gap-md">
            <div
              className="row"
              style={{
                gap: 14,
                alignItems: "center",
                padding: 16,
                background: "var(--primary-50)",
                borderRadius: 14,
              }}
            >
              <span className="avatar lg sq">{initials}</span>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {fullName || "Nombre del nuevo miembro"}
                </div>
                <div className="tiny muted">
                  El avatar se generará automáticamente
                </div>
              </div>
            </div>

            <DrawerSectionCard
              eyebrow="Datos personales"
              title="Información personal"
            >
              <div className="mf-grid">
                <DrawerField
                  label="Nombre"
                  name="firstName"
                  required
                  placeholder="Juan"
                  value={firstName}
                  onChange={setFirstName}
                />
                <DrawerField
                  label="Apellido"
                  name="lastName"
                  required
                  placeholder="Pérez"
                  value={lastName}
                  onChange={setLastName}
                />
                <DrawerField
                  label="Apodo"
                  name="nickName"
                  placeholder="Juanito"
                />
                <DrawerField
                  label="Fecha de nac."
                  name="dateOfBirth"
                  type="date"
                  placeholder="yyyy-MM-dd"
                />
                <DrawerField
                  label="Género"
                  name="gender"
                  type="select"
                  options={GENDER_OPTIONS}
                  defaultValue="Male"
                />
                <DrawerField
                  label="Estado civil"
                  name="maritalStatus"
                  type="select"
                  options={MARITAL_OPTIONS}
                  defaultValue="Single"
                />
                <DrawerField
                  label="Nacionalidad"
                  name="nationality"
                  type="select"
                  options={NATIONALITY_OPTIONS.map((o) => ({
                    value: o,
                    label: o,
                  }))}
                  defaultValue="Dominicano/a"
                />
                <DrawerField
                  label="Tipo ID"
                  name="idType"
                  type="select"
                  options={ID_TYPE_OPTIONS}
                  defaultValue="ID Card"
                />
                <DrawerField
                  label="Número ID"
                  name="idNumber"
                  placeholder="000-0000000-0"
                  span={2}
                />
              </div>
            </DrawerSectionCard>

            <DrawerSectionCard eyebrow="Ubicación" title="Información de dirección">
              <div className="mf-grid">
                <DrawerField
                  label="Dirección"
                  name="streetAddress"
                  placeholder="Calle Principal #12"
                  span={2}
                />
                <DrawerField
                  label="Provincia"
                  name="stateProvince"
                  placeholder="Santiago"
                  defaultValue="Santiago"
                />
                <DrawerField
                  label="Ciudad / Estado"
                  name="cityState"
                  placeholder="Santiago"
                  defaultValue="Santiago"
                />
                <DrawerField
                  label="País"
                  name="country"
                  type="select"
                  options={COUNTRY_OPTIONS.map((o) => ({ value: o, label: o }))}
                  defaultValue="República Dominicana"
                  span={2}
                />
              </div>
            </DrawerSectionCard>

            <DrawerSectionCard eyebrow="Comunicación" title="Contacto">
              <div className="mf-grid">
                <DrawerField
                  label="Teléfono"
                  name="phone"
                  required
                  placeholder="809-000-0000"
                />
                <DrawerField
                  label="Celular"
                  name="mobilePhone"
                  placeholder="829-000-0000"
                />
                <DrawerField
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="juan@correo.com"
                  span={2}
                />
              </div>
            </DrawerSectionCard>
          </div>

          <input type="hidden" name="isActive" value="true" />
          <input type="hidden" name="isMember" value="true" />
          <input type="hidden" name="membershipRole" value="" />
          <input type="hidden" name="bio" value="" />

          <div className="drawer-foot">
            <button
              type="button"
              className="btn outline"
              onClick={onClose}
              disabled={pending}
            >
              Cancelar
            </button>
            <button type="submit" className="btn primary" disabled={pending}>
              <Icons.check size={16} />
              {pending ? "Guardando…" : "Guardar miembro"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function DrawerSectionCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">{eyebrow}</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              marginTop: 3,
              color: "var(--fg)",
            }}
          >
            {title}
          </div>
        </div>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function DrawerField({
  label,
  name,
  required,
  type = "text",
  options,
  placeholder,
  span = 1,
  defaultValue,
  value,
  onChange,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  options?: readonly SelectOption[] | readonly string[];
  placeholder?: string;
  span?: number;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const selectOptions: SelectOption[] = options
    ? options.map((o) =>
        typeof o === "string" ? { value: o, label: o } : o,
      )
    : [];

  return (
    <div className="field" style={{ gridColumn: `span ${span}` }}>
      <label htmlFor={name}>
        {label}
        {required ? (
          <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>
        ) : null}
      </label>
      <div className="input-wrap">
        {type === "select" ? (
          <select
            id={name}
            name={name}
            defaultValue={defaultValue}
            required={required}
          >
            {selectOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={name}
            name={name}
            type={type}
            placeholder={placeholder}
            defaultValue={value === undefined ? defaultValue : undefined}
            value={value}
            onChange={
              onChange ? (e) => onChange(e.target.value) : undefined
            }
            required={required}
          />
        )}
      </div>
    </div>
  );
}
