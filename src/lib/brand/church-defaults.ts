/** Colores de marca por iglesia — defaults del producto (UI_SPEC / AGENTS.md). */
export const CHURCH_BRAND_DEFAULTS = {
  primaryColor: "#5B21B6",
  secondaryColor: "#4C1D95",
  accentColor: "#1E0A4C",
} as const;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** Normaliza a `#RRGGBB` en mayúsculas; fallback si el valor no es hex válido. */
export function normalizeChurchHexColor(
  value: string | null | undefined,
  fallback: string = CHURCH_BRAND_DEFAULTS.primaryColor,
): string {
  const trimmed = (value ?? "").trim();
  if (HEX_COLOR.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return fallback.toUpperCase();
}
