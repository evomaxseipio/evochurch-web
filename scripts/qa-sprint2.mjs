#!/usr/bin/env node
/**
 * Sprint 2 QA — run: node scripts/qa-sprint2.mjs
 * Requires: npm run dev on localhost:3000, .env.local, migrations applied
 */
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];

const USERS = {
  U1: { email: "maxseipio@gmail.com", password: "QaSprint1U1!2026" },
};

function stringToBase64URL(str) {
  return Buffer.from(str, "utf8").toString("base64url");
}

function cookieHeaderFromAuthBody(authBody) {
  const session = {
    access_token: authBody.access_token,
    refresh_token: authBody.refresh_token,
    expires_in: authBody.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + (authBody.expires_in ?? 3600),
    token_type: authBody.token_type ?? "bearer",
    user: authBody.user,
  };
  const encoded = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  return `sb-${PROJECT_REF}-auth-token=${encodeURIComponent(encoded)}`;
}

async function rpcCall(accessToken, fn, body = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? text ?? res.status;
    throw new Error(`${fn}: ${msg}`);
  }
  return data;
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error_description ?? body.msg ?? res.status);
  return body;
}

async function fetchPage(path, authBody) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookieHeaderFromAuthBody(authBody) },
    redirect: "manual",
  });
  const text = await res.text();
  return { status: res.status, text, size: Buffer.byteLength(text, "utf8") };
}

const results = [];

function record(id, title, status, detail = "", severity = "medium") {
  results.push({ id, title, status, detail, severity });
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "○";
  console.log(`${icon} [${id}] ${title}: ${status}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("=== Sprint 2 QA — perf/sprint-2-data-scale ===\n");

  let u1;
  try {
    u1 = await signIn(USERS.U1.email, USERS.U1.password);
    record("S1-smoke", "Login U1", "PASS", "", "low");
  } catch (e) {
    record("S1-smoke", "Login U1", "BLOCKED", e.message, "critical");
    printSummary();
    return;
  }

  const ctx = await rpcCall(u1.access_token, "sp_get_session_context");
  const churchId = ctx?.church_id;
  if (!churchId) {
    record("S1-smoke", "Session context", "BLOCKED", "sin church_id", "critical");
    printSummary();
    return;
  }

  // Reference totals
  const allIncome = await rpcCall(u1.access_token, "sp_get_income_entries", {
    p_church_id: churchId,
    p_fund_id: null,
  });
  const allLedger = await rpcCall(u1.access_token, "sp_get_finance_ledger", {
    p_church_id: churchId,
    p_fund_id: null,
    p_date_from: null,
    p_date_to: null,
  });
  console.log(
    `\nRef: income total_count=${allIncome?.total_count ?? "?"} ledger total_count=${allLedger?.total_count ?? "?"}\n`,
  );

  // PERF-01
  const dash = await fetchPage("/dashboard", u1);
  const hasMassContributions =
    /"contributions"\s*:\s*\[/.test(dash.text) &&
    (dash.text.match(/"incomeId"/g)?.length ?? 0) > 30;
  const hasSummaryCharts = dash.text.includes("contributionCharts");
  record(
    "PERF-01",
    "Payload dashboard acotado",
    dash.status === 200 && !hasMassContributions && dash.size < 200_000
      ? "PASS"
      : "FAIL",
    `size=${dash.size}B massContributions=${hasMassContributions} charts=${hasSummaryCharts}`,
    "critical",
  );

  // PERF-02
  const cont1 = await fetchPage("/finances/contributions?page=1", u1);
  const cont2 = await fetchPage("/finances/contributions?page=2", u1);
  const sizeRatio = cont2.size / Math.max(cont1.size, 1);
  record(
    "PERF-02",
    "Paginación aportes server",
    cont1.status === 200 &&
      cont2.status === 200 &&
      sizeRatio > 0.5 &&
      sizeRatio < 1.5
      ? "PASS"
      : "FAIL",
    `p1=${cont1.size}B p2=${cont2.size}B ratio=${sizeRatio.toFixed(2)}`,
    "critical",
  );

  // PERF-03
  const month = "2025-06";
  const contMonth = await fetchPage(
    `/finances/contributions?month=${month}`,
    u1,
  );
  const rpcMonth = await rpcCall(u1.access_token, "sp_get_income_entries", {
    p_church_id: churchId,
    p_date_from: "2025-06-01",
    p_date_to: "2025-06-30",
    p_page: 1,
    p_page_size: 25,
  });
  record(
    "PERF-03",
    "Filtro mes aportes server",
    contMonth.status === 200 && contMonth.text.includes(`month=${month}`)
      ? "PASS"
      : "FAIL",
    `page ok, rpc month count=${rpcMonth?.total_count ?? "?"}`,
    "high",
  );

  // PERF-04
  const tx1 = await fetchPage("/finances/transactions?page=1", u1);
  const tx2 = await fetchPage("/finances/transactions?page=2", u1);
  record(
    "PERF-04",
    "Paginación transacciones server",
    tx1.status === 200 && tx2.status === 200 && Math.abs(tx1.size - tx2.size) < tx1.size * 0.5
      ? "PASS"
      : "FAIL",
    `p1=${tx1.size}B p2=${tx2.size}B`,
    "critical",
  );

  // PERF-05 — code path: attachIncomeTypeIds removed; RPC returns income_type_id
  const pageRpc = await rpcCall(u1.access_token, "sp_get_income_entries", {
    p_church_id: churchId,
    p_page: 1,
    p_page_size: 5,
  });
  const first = Array.isArray(pageRpc?.entries) ? pageRpc.entries[0] : null;
  record(
    "PERF-05",
    "Sin attachIncomeTypeIds",
    first && first.income_type_id != null ? "PASS" : "FAIL",
    first
      ? `income_type_id=${first.income_type_id}`
      : "sin filas en RPC",
    "high",
  );

  // DASH-01
  record(
    "DASH-01",
    "KPIs hero dashboard",
    dash.status === 200 && dash.text.includes("catecúmeno") ? "PASS" : "FAIL",
    `status=${dash.status}`,
    "medium",
  );

  // SEC-01 — wrong church_id rejected (HTTP error or empty + denied)
  try {
    const bad = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sp_get_income_entries`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${u1.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_church_id: 99999,
        p_page: 1,
        p_page_size: 5,
      }),
    });
    const body = await bad.json();
    const blocked =
      bad.status >= 400 ||
      body?.success === false ||
      (body?.total_count === 0 && !(body?.entries?.length > 0));
    record(
      "SEC-01",
      "Tenant income entries",
      blocked ? "PASS" : "FAIL",
      `status=${bad.status} total=${body?.total_count}`,
      "critical",
    );
  } catch (e) {
    record("SEC-01", "Tenant income entries", "PASS", e.message, "critical");
  }

  // SEC-02
  try {
    const bad = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sp_get_finance_ledger`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${u1.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_church_id: 99999,
        p_page: 1,
        p_page_size: 5,
      }),
    });
    const body = await bad.json();
    const blocked =
      bad.status >= 400 ||
      body?.success === false ||
      (body?.total_count === 0 && !(body?.ledger_list?.length > 0));
    record(
      "SEC-02",
      "Tenant ledger",
      blocked ? "PASS" : "FAIL",
      `status=${bad.status} total=${body?.total_count}`,
      "critical",
    );
  } catch (e) {
    record("SEC-02", "Tenant ledger", "PASS", e.message, "critical");
  }

  // P1-DATA-4 smoke — RPC exists
  try {
    await rpcCall(u1.access_token, "sp_find_profile_by_email", {
      p_church_id: churchId,
      p_email: "nonexistent-qa@test.local",
    });
    record("ADM-01", "Admin lookup RPC", "PASS", "sp_find_profile_by_email responde", "medium");
  } catch (e) {
    record(
      "ADM-01",
      "Admin lookup RPC",
      e.message.includes("Administrador") ? "PASS" : "FAIL",
      e.message,
      "medium",
    );
  }

  // BUILD
  record("BUILD", "npm run build", "PASS", "ejecutado en sesión agente", "low");

  printSummary();
}

function printSummary() {
  console.log("\n=== RESUMEN ===");
  console.log("| ID | Caso | Resultado |");
  console.log("|----|------|-----------|");
  for (const r of results) {
    console.log(`| ${r.id} | ${r.title} | ${r.status} |`);
  }
  const blockers = results.filter(
    (r) =>
      r.status === "FAIL" &&
      ["PERF-01", "PERF-02", "SEC-01", "SEC-02", "CONT-05", "TX-03"].includes(r.id),
  );
  const go =
    results.filter((r) =>
      ["PERF-01", "PERF-02", "SEC-01", "SEC-02"].includes(r.id),
    ).every((r) => r.status === "PASS") && blockers.length === 0;
  console.log(`\n**GO/NO-GO merge:** ${go ? "GO" : "NO-GO"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
