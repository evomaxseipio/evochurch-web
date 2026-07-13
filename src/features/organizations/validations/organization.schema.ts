import { z } from "zod";
import {
  ORGANIZATION_SOURCES,
  ORGANIZATION_STATUSES,
  ORGANIZATION_TYPES,
} from "../types/organization.enums";

const trimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`);

const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const emailField = z
  .string()
  .trim()
  .max(255)
  .email("Email inválido.")
  .optional()
  .or(z.literal(""))
  .transform((value) => (value && value.length > 0 ? value : null));

const websiteField = z
  .string()
  .trim()
  .max(255)
  .regex(/^https?:\/\/.+/i, "Debe iniciar con http:// o https://")
  .optional()
  .or(z.literal(""))
  .transform((value) => (value && value.length > 0 ? value : null));

export const organizationTypeSchema = z.enum(ORGANIZATION_TYPES);
export const organizationStatusSchema = z.enum(ORGANIZATION_STATUSES);
export const organizationSourceSchema = z.enum(ORGANIZATION_SOURCES);

/** Campos compartidos por crear/editar. */
const organizationBaseShape = {
  name: trimmed(160).min(1, "El nombre es obligatorio."),
  denomination: optionalText(120),
  country: trimmed(2)
    .min(2, "País inválido.")
    .transform((value) => value.toUpperCase())
    .default("DO"),
  province: optionalText(120),
  city: trimmed(120).min(1, "La ciudad es obligatoria."),
  addressLine: optionalText(255),
  phone: optionalText(40),
  email: emailField,
  website: websiteField,
  facebook: optionalText(120),
  instagram: optionalText(120),
  source: organizationSourceSchema,
  notes: optionalText(2000),
};

/** Alta — en MVP solo se permite CHURCH. */
export const createOrganizationSchema = z.object({
  ...organizationBaseShape,
  type: organizationTypeSchema.default("CHURCH"),
});

/** Edición — todos los campos opcionales excepto los que definan las reglas. */
export const updateOrganizationSchema = z.object({
  ...organizationBaseShape,
  type: organizationTypeSchema,
});

export const changeStatusSchema = z.object({
  status: organizationStatusSchema,
});

export type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;
export type CreateOrganizationValues = z.output<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.input<typeof updateOrganizationSchema>;
export type UpdateOrganizationValues = z.output<typeof updateOrganizationSchema>;

/**
 * Schema del formulario UI (react-hook-form).
 * Sin transforms null → input === output === strings, evitando mismatches de resolver.
 * La normalización (trim/"" → null) la realiza el service con create/updateOrganizationSchema.
 */
export const organizationFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(160),
  type: organizationTypeSchema,
  denomination: z.string().trim().max(120),
  country: z
    .string()
    .trim()
    .min(2, "País inválido.")
    .max(2, "Usa el código ISO de 2 letras."),
  province: z.string().trim().max(120),
  city: z.string().trim().min(1, "La ciudad es obligatoria.").max(120),
  addressLine: z.string().trim().max(255),
  phone: z.string().trim().max(40),
  email: z
    .string()
    .trim()
    .max(255)
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Email inválido.",
    ),
  website: z
    .string()
    .trim()
    .max(255)
    .refine(
      (value) => value === "" || /^https?:\/\/.+/i.test(value),
      "Debe iniciar con http:// o https://",
    ),
  facebook: z.string().trim().max(120),
  instagram: z.string().trim().max(120),
  source: organizationSourceSchema,
  notes: z.string().trim().max(2000),
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
