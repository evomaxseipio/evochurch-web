/** Valores alineados con Flutter/Supabase; etiquetas en español para la UI. */

export type SelectOption = { value: string; label: string };

export const GENDER_OPTIONS: readonly SelectOption[] = [
  { value: "Male", label: "Masculino" },
  { value: "Female", label: "Femenino" },
  { value: "Other", label: "Otro" },
] as const;

export const MARITAL_OPTIONS: readonly SelectOption[] = [
  { value: "Single", label: "Soltero/a" },
  { value: "Married", label: "Casado/a" },
  { value: "Divorced", label: "Divorciado/a" },
  { value: "Widowed", label: "Viudo/a" },
] as const;

export const ID_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: "ID Card", label: "Cédula" },
  { value: "Passport", label: "Pasaporte" },
  { value: "Other", label: "Otro" },
] as const;

export const BLOOD_TYPE_VALUES = [
  "",
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Unknown",
] as const;

export type BloodTypeValue = (typeof BLOOD_TYPE_VALUES)[number];

function matchOption(
  raw: string,
  options: readonly SelectOption[],
): string {
  const t = raw.trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  const hit = options.find(
    (o) =>
      o.value.toLowerCase() === lower || o.label.toLowerCase() === lower,
  );
  return hit?.value ?? t;
}

export function normalizeGender(raw: string): string {
  return matchOption(raw, GENDER_OPTIONS);
}

export function normalizeMaritalStatus(raw: string): string {
  return matchOption(raw, MARITAL_OPTIONS);
}

export function normalizeIdType(raw: string): string {
  const aliases: Record<string, string> = {
    cédula: "ID Card",
    cedula: "ID Card",
    pasaporte: "Passport",
    otro: "Other",
  };
  const t = raw.trim();
  if (!t) return "";
  const alias = aliases[t.toLowerCase()];
  if (alias) return alias;
  return matchOption(t, ID_TYPE_OPTIONS);
}

export function labelForOption(
  value: string,
  options: readonly SelectOption[],
): string {
  if (!value) return "";
  const hit = options.find((o) => o.value === value);
  return hit?.label ?? value;
}
