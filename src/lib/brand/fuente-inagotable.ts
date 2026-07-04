/** Marca — Iglesia Fuente Inagotable (assets en `public/brand/fuente-inagotable/`). */
export const FUENTE_INAGOTABLE = {
  slug: "fuente-inagotable",
  displayName: "Fuente Inagotable",
  churchDisplayName: "Iglesia Fuente Inagotable",
  logos: {
    /** PNG con fondo blanco — informes, documentos, previews. */
    onWhite: "/brand/fuente-inagotable/logo-on-white.png",
    /** Transparente, trazo azul/morado — fondos claros (crema, blanco). */
    color: "/brand/fuente-inagotable/logo-color.png",
    /** Transparente, blanco — fondos oscuros o morado de marca (sidebar). */
    white: "/brand/fuente-inagotable/logo-white.png",
  },
} as const;

export type FuenteInagotableLogoKey = keyof typeof FUENTE_INAGOTABLE.logos;
