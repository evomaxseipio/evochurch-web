#!/usr/bin/env node
/**
 * Reportes MVP QA — run: node scripts/qa-reports.mjs
 * Requires: npm run dev on localhost:3000, .env.local, QA RBAC users (npm run qa:rbac:seed)
 *
 * Automatiza R-01, R-03, R-09 y verificación de permisos por rol.
 * R-02, R-04–R-08 requieren usuario Secretario o descargas manuales → BLOCKED documentado.
 */
import {
  fetchPage,
  getQaRbacUsers,
  getSupabaseConfig,
  isDevServerUp,
  loadEnv,
  permissionsFromContext,
  rpcCall,
  signIn,
} from "./lib/qa-env.mjs";

const FINANCIAL_REPORT_IDS = [
  "financial-monthly-cead",
  "executive-monthly-summary",
];
const MEMBERSHIP_REPORT_IDS = [
  "membership-directory",
  "membership-annual-cead",
];

const results = [];

function record(id, title, status, detail = "") {
  results.push({ id, title, status, detail });
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "○";
  console.log(`${icon} [${id}] ${title}: ${status}${detail ? ` — ${detail}` : ""}`);
}

function isNextErrorPage(text) {
  return /id="__next_error__"/.test(text);
}

function pageReportsHub({ status, text }) {
  if (status !== 200 || isNextErrorPage(text)) return false;
  return /reports-hub|data-testid="reports-hub"/i.test(text);
}

function pageReportsDenied({ status, text, location }) {
  if (status >= 300 && status < 400) return true;
  if (location?.includes("denied=1")) return true;
  if (/NEXT_REDIRECT.*denied=1|"destination":"\/settings\?denied=1"/i.test(text)) {
    return true;
  }
  return status !== 200 || isNextErrorPage(text);
}

function htmlHasReportIds(text, ids) {
  return ids.every((id) => text.includes(id));
}

function hasReportPermission(perms, resource, action) {
  return perms.includes(`reports:${resource}:${action}`);
}

async function loginRole(role) {
  const users = getQaRbacUsers(loadEnv());
  const creds = users[role];
  if (!creds?.email || !creds?.password) return null;
  try {
    const auth = await signIn(creds.email, creds.password);
    const ctx = await rpcCall(auth.access_token, "sp_get_session_context");
    return { auth, ctx, perms: permissionsFromContext(ctx) };
  } catch (e) {
    record("AUTO", `Login ${role}`, "BLOCKED", e.message);
    return null;
  }
}

async function main() {
  console.log("=== Reportes MVP QA ===\n");

  const env = loadEnv();
  const { url, anonKey } = getSupabaseConfig(env);
  if (!url || !anonKey) {
    record("ENV", "Supabase config", "FAIL", "missing NEXT_PUBLIC_SUPABASE_*");
    printSummary();
    process.exit(1);
  }
  record("ENV", "Supabase config", "PASS");

  if (!(await isDevServerUp())) {
    for (const id of ["R-01", "R-03"]) {
      record(id, "Route /reports", "BLOCKED", "npm run dev no responde :3000");
    }
  } else {
    const tesorero = await loginRole("TESORERO");
    if (tesorero) {
      const page = await fetchPage("/reports", tesorero.auth);
      const hubOk = pageReportsHub(page);
      const hasFinancial = htmlHasReportIds(page.text, FINANCIAL_REPORT_IDS);
      record(
        "R-01",
        "Tesorero /reports hub financiero + ejecutivo",
        hubOk && hasFinancial ? "PASS" : "FAIL",
        `status=${page.status} financial=${hasFinancial}`,
      );
    } else {
      record("R-01", "Tesorero /reports", "BLOCKED", "sin credenciales QA");
    }

    record(
      "R-02",
      "Secretario solo membresía",
      "BLOCKED",
      "sin usuario QA Secretario — validar manualmente",
    );

    const norole = await loginRole("NOROLE");
    if (norole) {
      const page = await fetchPage("/reports", norole.auth);
      record(
        "R-03",
        "Sin permiso /reports",
        pageReportsDenied(page) ? "PASS" : "FAIL",
        `status=${page.status}`,
      );
    } else {
      record("R-03", "Sin permiso /reports", "BLOCKED", "sin U-NOROLE");
    }
  }

  const admin = await loginRole("ADMIN");
  if (admin) {
    const canExportFinancial =
      hasReportPermission(admin.perms, "financial_monthly_cead", "read") &&
      hasReportPermission(admin.perms, "financial_monthly_cead", "export");
    record(
      "R-PERM",
      "Admin export financial-monthly-cead",
      canExportFinancial ? "PASS" : "FAIL",
      `export=${hasReportPermission(admin.perms, "financial_monthly_cead", "export")}`,
    );

    try {
      const bad = await fetch(`${url}/rest/v1/rpc/sp_get_income_entries`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${admin.auth.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_church_id: 999999,
          p_page: 1,
          p_page_size: 1,
        }),
      });
      record(
        "R-09",
        "Tenant aislado (church_id inválido)",
        bad.status === 400 || bad.status === 403 ? "PASS" : "FAIL",
        `status=${bad.status}`,
      );
    } catch (e) {
      record("R-09", "Tenant aislado", "FAIL", e.message);
    }
  } else {
    record("R-09", "Tenant aislado", "BLOCKED", "sin U-ADMIN");
  }

  for (const id of ["R-04", "R-05", "R-06", "R-07", "R-08"]) {
    record(id, "Descarga / export manual", "BLOCKED", "validar en browser — ver REP-QA");
  }

  record("R-10", "npm run build", "BLOCKED", "ejecutar manualmente: npm run build");

  printSummary();
}

function printSummary() {
  console.log("\n=== RESUMEN ===");
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL");
  const blocked = results.filter((r) => r.status === "BLOCKED");
  console.log(`PASS=${pass} FAIL=${fail.length} BLOCKED=${blocked.length}`);
  if (fail.length) {
    console.log("FAIL:", fail.map((r) => r.id).join(", "));
  }
  process.exit(fail.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
