import { FUENTE_INAGOTABLE } from "./fuente-inagotable";

export {
  FUENTE_INAGOTABLE,
  type FuenteInagotableLogoKey,
} from "./fuente-inagotable";

/** Superficie donde se coloca el logo (elige contraste automático). */
export type BrandLogoSurface = "light" | "dark" | "brand" | "document";

/**
 * Devuelve la ruta pública del logo según el fondo.
 * - `document` → logo con fondo blanco
 * - `light` → trazo color sobre fondo claro
 * - `dark` / `brand` → blanco sobre morado u oscuro
 */
export function brandLogoForSurface(surface: BrandLogoSurface): string {
  switch (surface) {
    case "document":
      return FUENTE_INAGOTABLE.logos.onWhite;
    case "light":
      return FUENTE_INAGOTABLE.logos.color;
    case "dark":
    case "brand":
      return FUENTE_INAGOTABLE.logos.white;
  }
}
