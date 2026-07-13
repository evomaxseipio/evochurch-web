"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { OrganizationActionResult } from "@/app/apps/backoffice/organizations/actions";
import { Icons } from "@/components/icons";
import { toast } from "sonner";
import {
  ORGANIZATION_SOURCES,
  ORGANIZATION_TYPES,
  type OrganizationType,
} from "../types/organization.enums";
import type { OrganizationVm } from "../schemas/organization.responses";
import {
  applyOrganizationMutationResult,
  useCreateOrganization,
  useUpdateOrganization,
} from "../hooks";
import {
  organizationFormSchema,
  type OrganizationFormValues,
} from "../validations/organization.schema";
import {
  ORGANIZATION_SOURCE_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from "./organization-labels";

type FormValues = OrganizationFormValues;

const EMPTY_VALUES: FormValues = {
  name: "",
  type: "CHURCH",
  denomination: "",
  country: "DO",
  province: "",
  city: "",
  addressLine: "",
  phone: "",
  email: "",
  website: "",
  facebook: "",
  instagram: "",
  source: "REFERRAL",
  notes: "",
};

const COUNTRY_OPTIONS = [
  { value: "DO", label: "República Dominicana" },
  { value: "US", label: "Estados Unidos" },
  { value: "PR", label: "Puerto Rico" },
] as const;

function toFormValues(org: OrganizationVm): FormValues {
  return {
    name: org.name,
    type: org.type,
    denomination: org.denomination ?? "",
    country: org.country,
    province: org.province ?? "",
    city: org.city,
    addressLine: org.addressLine ?? "",
    phone: org.phone ?? "",
    email: org.email ?? "",
    website: org.website ?? "",
    facebook: org.facebook ?? "",
    instagram: org.instagram ?? "",
    source: org.source,
    notes: org.notes ?? "",
  };
}

function FormSection({
  title,
  hint,
  defaultCollapsed = false,
  full,
  children,
}: {
  title: string;
  hint: string;
  defaultCollapsed?: boolean;
  full?: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`bo-form-section${collapsed ? " collapsed" : ""}`}>
      <button
        type="button"
        className="bo-form-section-head"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span className="title">{title}</span>
        <span className="hint">{hint}</span>
      </button>
      <div className={`bo-form-section-body${full ? " is-full" : ""}`}>
        <div className="mf-grid">{children}</div>
      </div>
    </div>
  );
}

/** Mismo patrón que church console: `.field` → `.input-wrap` → control */
function FormField({
  label,
  required,
  error,
  hint,
  className = "",
  multiline = false,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  multiline?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`field ${className}`.trim()}>
      <label>
        {label}
        {required ? (
          <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>
        ) : null}
      </label>
      <div
        className={`input-wrap${error ? " error" : ""}`}
        style={
          multiline
            ? { alignItems: "flex-start", padding: "10px 12px" }
            : undefined
        }
      >
        {children}
      </div>
      {error ? <div className="help error">{error}</div> : null}
      {hint ? <div className="help">{hint}</div> : null}
    </div>
  );
}

export function OrganizationFormDrawer({
  open,
  onClose,
  organization,
  redirectToDetail = false,
}: {
  open: boolean;
  onClose: () => void;
  organization?: OrganizationVm | null;
  redirectToDetail?: boolean;
}) {
  const isEdit = Boolean(organization);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const typeOptions: readonly OrganizationType[] = isEdit
    ? ORGANIZATION_TYPES
    : (["CHURCH"] as const);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) {
      setFormError(null);
      setDuplicateWarning(false);
      reset(organization ? toFormValues(organization) : EMPTY_VALUES);
    }
  }, [open, organization, reset]);

  const applyResult = (result: OrganizationActionResult) => {
    applyOrganizationMutationResult(result, {
      onSuccess: () => {
        onClose();
      },
      onDuplicate: (message) => {
        setDuplicateWarning(true);
        setFormError(message);
      },
      onValidation: (message, fieldErrors) => {
        if (fieldErrors) {
          for (const [field, messages] of Object.entries(fieldErrors)) {
            setError(field as keyof FormValues, { message: messages[0] });
          }
        }
        setFormError(message);
      },
      onError: (message) => {
        setFormError(message);
        toast.error(message);
      },
    });
  };

  const submit = (allowDuplicate: boolean) =>
    handleSubmit((values) => {
      setFormError(null);
      const payload = { ...values, type: values.type ?? "CHURCH" };

      if (isEdit) {
        updateMutation.mutate(
          { id: organization!.id, request: payload },
          { onSuccess: (result) => applyResult(result) },
        );
        return;
      }

      createMutation.mutate(
        {
          request: payload,
          allowDuplicate,
          redirectToDetail,
        },
        {
          onSuccess: (result) => {
            if (result.ok) {
              onClose();
              return;
            }
            applyResult(result);
          },
        },
      );
    });

  if (!open) return null;

  return (
    <>
      <div
        className="drawer-backdrop"
        onClick={isPending ? undefined : onClose}
        aria-hidden
      />
      <div
        className="drawer bo-org-form-drawer"
        role="dialog"
        aria-labelledby="org-form-title"
      >
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <h2 id="org-form-title">
              {isEdit ? "Editar organización" : "Nueva organización"}
            </h2>
            <div className="sub">
              {isEdit
                ? "Actualiza la información del prospecto"
                : "Registra en menos de 2 minutos"}
            </div>
          </div>
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={onClose}
            disabled={isPending}
            aria-label="Cerrar"
          >
            <Icons.x size={18} />
          </button>
        </div>

        <form
          className="drawer-body col gap-md"
          onSubmit={submit(false)}
          noValidate
          id="org-form"
        >
          {formError ? (
            <div
              className="card flat"
              style={{
                padding: "10px 12px",
                borderColor: duplicateWarning ? "var(--warn)" : "var(--danger)",
                background: duplicateWarning
                  ? "color-mix(in oklab, var(--warn) 10%, transparent)"
                  : "color-mix(in oklab, var(--danger) 10%, transparent)",
                color: duplicateWarning ? "var(--warn)" : "var(--danger)",
                fontSize: 13,
              }}
            >
              {formError}
            </div>
          ) : null}

          <FormSection title="Identificación" hint="Requerido">
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <FormField
                  label="Nombre"
                  required
                  error={errors.name?.message}
                  className="span-2"
                >
                  <input
                    {...field}
                    placeholder="Ej. Iglesia Central Bautista"
                  />
                </FormField>
              )}
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormField
                  label="Tipo"
                  required
                  hint={!isEdit ? "Solo iglesias en esta versión" : undefined}
                >
                  <select {...field}>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {ORGANIZATION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            />
            <Controller
              name="denomination"
              control={control}
              render={({ field }) => (
                <FormField label="Denominación">
                  <input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Ej. Bautista"
                  />
                </FormField>
              )}
            />
          </FormSection>

          <FormSection title="Ubicación" hint="Ciudad requerida">
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <FormField label="País" error={errors.country?.message}>
                  <select {...field}>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            />
            <Controller
              name="province"
              control={control}
              render={({ field }) => (
                <FormField label="Provincia">
                  <input {...field} value={field.value ?? ""} />
                </FormField>
              )}
            />
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <FormField
                  label="Ciudad"
                  required
                  error={errors.city?.message}
                >
                  <input {...field} />
                </FormField>
              )}
            />
            <Controller
              name="addressLine"
              control={control}
              render={({ field }) => (
                <FormField label="Dirección">
                  <input {...field} value={field.value ?? ""} />
                </FormField>
              )}
            />
          </FormSection>

          <FormSection title="Contacto" hint="Opcional">
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <FormField label="Teléfono">
                  <input {...field} value={field.value ?? ""} type="tel" />
                </FormField>
              )}
            />
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <FormField label="Email" error={errors.email?.message}>
                  <input {...field} value={field.value ?? ""} type="email" />
                </FormField>
              )}
            />
            <Controller
              name="website"
              control={control}
              render={({ field }) => (
                <FormField label="Sitio web" error={errors.website?.message}>
                  <input
                    {...field}
                    value={field.value ?? ""}
                    type="url"
                    placeholder="https://..."
                  />
                </FormField>
              )}
            />
            <Controller
              name="facebook"
              control={control}
              render={({ field }) => (
                <FormField label="Facebook">
                  <input {...field} value={field.value ?? ""} />
                </FormField>
              )}
            />
            <Controller
              name="instagram"
              control={control}
              render={({ field }) => (
                <FormField label="Instagram" className="span-2">
                  <input {...field} value={field.value ?? ""} />
                </FormField>
              )}
            />
          </FormSection>

          <FormSection title="Comercial" hint="Requerido" full>
            <Controller
              name="source"
              control={control}
              render={({ field }) => (
                <FormField
                  label="Fuente"
                  required
                  error={errors.source?.message}
                >
                  <select {...field}>
                    {ORGANIZATION_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {ORGANIZATION_SOURCE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            />
          </FormSection>

          <FormSection
            title="Observaciones"
            hint="Opcional"
            defaultCollapsed
            full
          >
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <FormField label="Notas internas" multiline>
                  <textarea
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Contexto comercial..."
                    rows={3}
                    style={{ resize: "vertical", minHeight: 72 }}
                  />
                </FormField>
              )}
            />
          </FormSection>
        </form>

        <div className="drawer-foot row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </button>
          {duplicateWarning ? (
            <button
              type="button"
              className="btn accent"
              onClick={submit(true)}
              disabled={isPending}
            >
              Crear de todos modos
            </button>
          ) : (
            <button
              type="button"
              className="btn primary"
              onClick={submit(false)}
              disabled={isPending}
            >
              {isEdit ? "Guardar cambios" : "Crear organización"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
