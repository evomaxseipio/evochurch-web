#!/usr/bin/env node
/**
 * Full RBAC QA orchestrator.
 * Run: node scripts/qa-rbac-full.mjs [--seed] [--skip-build] [--skip-e2e] [--keep-dev]
 */
import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import {
  loadEnv,
  getSupabaseConfig,
  isDevServerUp,
  waitForDevServer,
  rbacMigrationApplied,
  QA_RBAC_BASE,
} from "./lib/qa-env.mjs";

const args = new Set(process.argv.slice(2));
const shouldSeed = args.has("--seed");
const skipBuild = args.has("--skip-build");
const skipLint = args.has("--skip-lint");
const skipE2e = args.has("--skip-e2e");
const keepDev = args.has("--keep-dev");

const results = [];

function record(step, status, detail = "") {
  results.push({ step, status, detail });
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "○";
  console.log(`${icon} ${step}: ${status}${detail ? ` — ${detail}` : ""}`);
}

function run(cmd, label) {
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    record(label, "PASS");
    return true;
  } catch (e) {
    record(label, "FAIL", e.message ?? "exit != 0");
    return false;
  }
}

function spawnDev() {
  return spawn("npm", ["run", "dev"], {
    cwd: process.cwd(),
    stdio: "ignore",
    shell: false,
  });
}

async function main() {
  console.log("=== QA RBAC FULL — orquestador ===\n");

  const env = loadEnv();
  const { url, anonKey, serviceRoleKey } = getSupabaseConfig(env);

  if (!url || !anonKey) {
    record("ENV", "FAIL", "NEXT_PUBLIC_SUPABASE_* missing");
    printSummary();
    process.exit(1);
  }
  record("ENV", "PASS", "Supabase URL + anon key");

  if (shouldSeed) {
    if (!serviceRoleKey) {
      record("SEED", "BLOCKED", "SUPABASE_SERVICE_ROLE_KEY required for --seed");
    } else {
      run("node scripts/seed-rbac-qa-users.mjs --write-env", "SEED");
    }
  }

  const rbacReady = await rbacMigrationApplied(loadEnv());
  if (!rbacReady) {
    record(
      "RBAC-MIGRATION",
      "BLOCKED",
      "sp_get_session_context.permissions[] ausente — implementa Sprint RBAC primero",
    );
  } else {
    record("RBAC-MIGRATION", "PASS");
  }

  if (!skipBuild) {
    run("npm run build", "BUILD");
    if (!skipLint) {
      run("npm run lint", "LINT");
    } else {
      record("LINT", "N/A", "--skip-lint");
    }
  } else {
    record("BUILD", "N/A", "--skip-build");
    record("LINT", "N/A", skipLint ? "--skip-lint" : "--skip-build");
  }

  let devProc = null;
  let startedDev = false;

  if (!(await isDevServerUp())) {
    console.log("\nIniciando npm run dev…");
    devProc = spawnDev();
    startedDev = true;
    const up = await waitForDevServer(QA_RBAC_BASE, 120_000);
    if (!up) {
      record("DEV-SERVER", "FAIL", "timeout localhost:3000");
    } else {
      record("DEV-SERVER", "PASS", "started");
    }
  } else {
    record("DEV-SERVER", "PASS", "already running");
  }

  try {
    if (rbacReady) {
      run("node scripts/qa-rbac.mjs", "QA-RPC-PAGE");
    } else {
      record("QA-RPC-PAGE", "BLOCKED", "RBAC migration pending");
    }

    if (!skipE2e) {
      if (rbacReady) {
        run("npx playwright test e2e/rbac --reporter=list", "QA-E2E");
      } else {
        record("QA-E2E", "BLOCKED", "RBAC migration pending");
      }
    } else {
      record("QA-E2E", "N/A", "--skip-e2e");
    }
  } finally {
    if (devProc && startedDev && !keepDev) {
      devProc.kill("SIGTERM");
      console.log("\nDev server detenido.");
    } else if (keepDev && startedDev) {
      console.log("\nDev server sigue corriendo (--keep-dev).");
    }
  }

  printSummary();
}

function printSummary() {
  console.log("\n=== RESUMEN ORQUESTADOR ===");
  for (const r of results) {
    console.log(`  ${r.step}: ${r.status}${r.detail ? ` (${r.detail})` : ""}`);
  }

  const blocking = results.filter(
    (r) => r.status === "FAIL" || r.status === "BLOCKED",
  );
  const go = blocking.length === 0;

  console.log(`\n**GO/NO-GO Sprint RBAC:** ${go ? "GO" : "NO-GO"}`);
  if (!go) {
    console.log("QA NO CERRADO — resolver FAIL/BLOCKED y re-ejecutar:");
    console.log("  node scripts/qa-rbac-full.mjs [--seed]");
  }
  process.exit(go ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
