/** Colores de marca por iglesia — defaults del producto (UI_SPEC / AGENTS.md). */
export const CHURCH_BRAND_DEFAULTS = {
  primaryColor: "#5B21B6",
  secondaryColor: "#4C1D95",
  accentColor: "#1E0A4C",
} as const;

export type ChurchBrandInput =
  | {
      primaryColor?: string | null;
      secondaryColor?: string | null;
      accentColor?: string | null;
    }
  | null
  | undefined;

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

/** Variables CSS de marca — usable en SSR (style inline) y en cliente. */
export function resolveChurchBrandCssVars(
  branding: ChurchBrandInput,
): Record<string, string> {
  const primary = normalizeChurchHexColor(
    branding?.primaryColor,
    CHURCH_BRAND_DEFAULTS.primaryColor,
  );
  const secondary = normalizeChurchHexColor(
    branding?.secondaryColor,
    CHURCH_BRAND_DEFAULTS.secondaryColor,
  );
  const accent = normalizeChurchHexColor(
    branding?.accentColor,
    CHURCH_BRAND_DEFAULTS.accentColor,
  );
  const accentSoft = `color-mix(in oklab, ${primary} 16%, transparent)`;

  return {
    "--brand-primary": primary,
    "--brand-secondary": secondary,
    "--brand-accent": accent,
    "--accent": primary,
    "--accent-strong": secondary,
    "--accent-soft": accentSoft,
    "--accent-ink": "#FFFFFF",
    "--primary": primary,
    "--primary-500": primary,
    "--primary-600": secondary,
    "--primary-50": accentSoft,
    "--primary-100": accentSoft,
    "--sb-brand": primary,
    "--sb-bg": primary,
  };
}
