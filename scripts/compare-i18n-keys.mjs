#!/usr/bin/env node
/**
 * Compare i18n message key parity (es = source of truth) and flag likely
 * untranslated Spanish values in en/fr. Exit 1 on missing keys or Spanish leftovers.
 *
 * Usage: node scripts/compare-i18n-keys.mjs [--warn-only]
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MESSAGES_DIR = join(ROOT, "src/i18n/messages");
const SOURCE = "es";
const TARGETS = ["en", "fr"];
const warnOnly = process.argv.includes("--warn-only");

const SPANISH_RE =
  /[áéíóúñ¿¡]|ción|ezmo|iglesia|miembro|guardar|cancelar|configuración|efectivo|ingreso|egreso|ofrenda|donación|pendiente|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|próximamente|información|dirección|contraseña|correo electrónico/i;

/** Keys intentionally identical across locales (brands, cognates, ICU placeholders). */
const SAME_OK = new Set([
  "meta.title",
  "common.error",
  "common.total",
  "nav.dashboard",
  "nav.crumbAgenda",
  "dashboard.title",
  "dashboard.agenda",
  "members.email",
  "members.contactSection",
  "finances.contributionTypes.individual",
  "finances.titheClose.no",
  "finances.titheClose.yes",
  "common.yes",
  "common.no",
]);

function flatten(obj, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

function loadLocale(code) {
  const raw = readFileSync(join(MESSAGES_DIR, `${code}.json`), "utf8");
  return flatten(JSON.parse(raw));
}

function setExit(code) {
  process.exitCode = Math.max(process.exitCode ?? 0, code);
}

const source = loadLocale(SOURCE);
const sourceKeys = new Set(Object.keys(source));
let hasIssues = false;

console.log(`Source: ${SOURCE}.json (${sourceKeys.size} keys)\n`);

for (const target of TARGETS) {
  const data = loadLocale(target);
  const targetKeys = new Set(Object.keys(data));

  const missing = [...sourceKeys].filter((k) => !targetKeys.has(k)).sort();
  const extra = [...targetKeys].filter((k) => !sourceKeys.has(k)).sort();

  console.log(`── ${target}.json (${targetKeys.size} keys)`);

  if (missing.length) {
    hasIssues = true;
    console.log(`  Missing (${missing.length}):`);
    missing.forEach((k) => console.log(`    - ${k}`));
  } else {
    console.log("  Keys: OK (parity with es)");
  }

  if (extra.length) {
    hasIssues = true;
    console.log(`  Extra (${extra.length}):`);
    extra.forEach((k) => console.log(`    + ${k}`));
  }

  const spanishLeftovers = [...sourceKeys]
    .filter((k) => {
      const esVal = source[k];
      const tgtVal = data[k];
      if (typeof esVal !== "string" || typeof tgtVal !== "string") return false;
      if (tgtVal !== esVal) return false;
      if (SAME_OK.has(k)) return false;
      return SPANISH_RE.test(esVal);
    })
    .sort();

  if (spanishLeftovers.length) {
    hasIssues = true;
    console.log(`  Likely untranslated Spanish (${spanishLeftovers.length}):`);
    spanishLeftovers.slice(0, 20).forEach((k) => console.log(`    ~ ${k}: ${data[k]}`));
    if (spanishLeftovers.length > 20) {
      console.log(`    … and ${spanishLeftovers.length - 20} more`);
    }
  } else {
    console.log("  Spanish leftovers: none detected");
  }

  console.log();
}

if (hasIssues) {
  console.error("i18n key audit: issues found.");
  if (!warnOnly) setExit(1);
} else {
  console.log("i18n key audit: all checks passed.");
}
