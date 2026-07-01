"use client";

import { THEME_INIT_SCRIPT } from "@/lib/theme-init-script";
import { useServerInsertedHTML } from "next/navigation";

/**
 * Inyecta el script de tema en el HTML SSR fuera del árbol React
 * (evita el warning de React 19 sobre `<script>` en componentes).
 */
export function ThemeInit() {
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
  ));

  return null;
}
