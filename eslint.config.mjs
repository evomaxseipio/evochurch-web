import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Syncing form/drawer state on open is intentional; fixing ~20 drawers is high-risk.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prototipo HTML/React (no es parte de la app Next)
    "mockup/**",
    "uploads/**",
    // Handoff bundle de diseño (claude.ai/design) — no es código de producción
    "project/**",
  ]),
]);

export default eslintConfig;
