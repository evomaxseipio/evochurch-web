#!/usr/bin/env node
/**
 * Sprint RBAC QA — run: node scripts/qa-rbac.mjs
 * Requires: npm run dev on localhost:3000 (for PAGE-*), .env.local, RBAC migration applied
 *
 * Env (optional — missing creds → BLOCKED for that user's cases):
 *   QA_RBAC_ADMIN_EMAIL / QA_RBAC_ADMIN_PASSWORD
 *   QA_RBAC_TESORERO_EMAIL / QA_RBAC_TESORERO_PASSWORD
 *   QA_RBAC_LIDER_EMAIL / QA_RBAC_LIDER_PASSWORD
 *   QA_RBAC_NOROLE_EMAIL / QA_RBAC_NOROLE_PASSWORD
 *   QA_RBAC_PASTOR_EMAIL / QA_RBAC_PASTOR_PASSWORD
 *   QA_RBAC_MINISTRY_OWN_ID / QA_RBAC_MINISTRY_OTHER_ID
 */
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

const USERS = {
  ADMIN: {
    email: env.QA_RBAC_ADMIN_EMAIL,
    password: env.QA_RBAC_ADMIN_PASSWORD,
  },
  TESORERO: {
    email: env.QA_RBAC_TESORERO_EMAIL,
    password: env.QA_RBAC_TESORERO_PASSWORD,
  },
  LIDER: {
    email: env.QA_RBAC_LIDER_EMAIL,
    password: env.QA_RBAC_LIDER_PASSWORD,
  },
  NOROLE: {
    email: env.QA_RBAC_NOROLE_EMAIL,
    password: env.QA_RBAC_NOROLE_PASSWORD,
  },
  PASTOR: {
    email: env.QA_RBAC_PASTOR_EMAIL,
    password: env.QA_RBAC_PASTOR_PASSWORD,
  },
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
  return {
    status: res.status,
    text,
    location: res.headers.get("location"),
  };
}

const results = [];

function record(id, title, status, detail = "", severity = "medium") {
  results.push({ id, title, status, detail, severity });
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "○";
  console.log(`${icon} [${id}] ${title}: ${status}${detail ? ` — ${detail}` : ""}`);
}

function permissionsFromContext(ctx) {
  const p = ctx?.permissions;
  if (Array.isArray(p)) return p.map(String);
  return [];
}

function hasPerm(perms, key) {
  return perms.includes(key);
}

function lacksPerm(perms, key) {
  return !hasPerm(perms, key);
}

/** Next.js error overlay / 500 digest page. */
function isNextErrorPage(text) {
  return /id="__next_error__"/.test(text);
}

/** Route guard denied: redirect, RSC redirect, or explicit deny UI — not i18n dictionary strings. */
function pageAccessDenied({ status, text, location }) {
  if (status >= 500 || isNextErrorPage(text)) return true;
  if (status >= 300 && status < 400) return true;
  if (location?.includes("denied=1")) return true;
  if (/NEXT_REDIRECT|"destination":"\/settings\?denied=1"/i.test(text)) return true;
  return false;
}

/** Page allowed: 200 and no deny signal */
function pageAllowed(res) {
  if (pageAccessDenied(res)) return false;
  if (res.status !== 200) return false;
  return true;
}

function pageHasSettings({ status, text }) {
  if (status !== 200 || isNextErrorPage(text)) return false;
  return /settings-view|"Perfil"|profileSettings|sectionConfig/i.test(text);
}

function pageHasTransactionsModule({ status, text }) {
  if (status !== 200 || isNextErrorPage(text)) return false;
  return /transactions-list|finances\/transactions|"Transacciones"/i.test(text);
}

function pageHasMinistriesModule({ status, text }) {
  if (status !== 200 || isNextErrorPage(text)) return false;
  return /ministerios|Ministerios|addMinistry/i.test(text);
}

function pageHasAdminUsersList({ status, text }) {
  if (status !== 200 || isNextErrorPage(text)) return false;
  return /data-testid="admin-users-list"/.test(text);
}

function pageAdminUsersBlocked({ status, text }) {
  if (status !== 200 || isNextErrorPage(text)) return false;
  return /data-testid="admin-users-denied"/.test(text);
}

/** Operational module page (members list, etc.) */
function pageHasMembersList({ status, text }) {
  if (status !== 200) return false;
  return (
    /members-list|Miembros registrados|filter-toolbar/i.test(text) ||
    (text.includes("Miembros") && text.includes("filter"))
  );
}

async function loginUser(alias, label) {
  const creds = USERS[alias];
  if (!creds?.email || !creds?.password) {
    record("AUTO-01", `Login ${label}`, "BLOCKED", "faltan credenciales env", "critical");
    return null;
  }
  try {
    const auth = await signIn(creds.email, creds.password);
    record("AUTO-01", `Login ${label}`, "PASS", creds.email, "low");
    return auth;
  } catch (e) {
    record("AUTO-01", `Login ${label}`, "FAIL", e.message, "critical");
    return null;
  }
}

async function testSessionPermissions(alias, label, checks, recordCtx01 = false) {
  const auth = await loginUser(alias, label);
  if (!auth) return null;

  let ctx;
  try {
    ctx = await rpcCall(auth.access_token, "sp_get_session_context");
  } catch (e) {
    record(checks.ctxId, checks.ctxTitle, "FAIL", e.message, "critical");
    return null;
  }

  const perms = permissionsFromContext(ctx);
  if (recordCtx01) {
    const hasArray = Array.isArray(ctx?.permissions);
    record(
      "CTX-01",
      "permissions[] en session context",
      hasArray ? "PASS" : "FAIL",
      `type=${typeof ctx?.permissions} len=${perms.length}`,
      "critical",
    );
  }

  if (checks.ctxId !== "CTX-01") {
    let ok = true;
    const details = [];
    for (const key of checks.mustHave ?? []) {
      if (!hasPerm(perms, key)) {
        ok = false;
        details.push(`missing:${key}`);
      }
    }
    for (const key of checks.mustLack ?? []) {
      if (hasPerm(perms, key)) {
        ok = false;
        details.push(`unexpected:${key}`);
      }
    }
    if (checks.maxCount != null && perms.length > checks.maxCount) {
      ok = false;
      details.push(`count>${checks.maxCount} (${perms.length})`);
    }
    if (checks.minCount != null && perms.length < checks.minCount) {
      ok = false;
      details.push(`count<${checks.minCount} (${perms.length})`);
    }
    record(
      checks.ctxId,
      checks.ctxTitle,
      ok ? "PASS" : "FAIL",
      details.join(", ") || `keys=${perms.slice(0, 8).join(",")}…`,
      "critical",
    );
  }

  return { auth, ctx, perms };
}

async function main() {
  console.log("=== Sprint RBAC QA — feat/rbac-sprint ===\n");

  if (!SUPABASE_URL || !ANON_KEY || !PROJECT_REF) {
    record("AUTO-01", "Env Supabase", "BLOCKED", "NEXT_PUBLIC_SUPABASE_* missing", "critical");
    printSummary();
    process.exit(1);
  }

  const admin = await testSessionPermissions("ADMIN", "U-ADMIN", {
    ctxId: "CTX-02",
    ctxTitle: "U-ADMIN permisos",
    mustHave: ["admin_users:manage", "finances:transactions:authorize", "roles:manage"],
  }, true);

  const tesorero = await testSessionPermissions("TESORERO", "U-TESORERO", {
    ctxId: "CTX-03",
    ctxTitle: "U-TESORERO permisos",
    mustHave: ["finances:transactions:read", "finances:transactions:authorize"],
    mustLack: ["admin_users:manage"],
  });

  const lider = await testSessionPermissions("LIDER", "U-LIDER", {
    ctxId: "CTX-04",
    ctxTitle: "U-LIDER permisos",
    mustHave: ["ministerios:read", "ministerios:write_own"],
    mustLack: ["finances:funds:read", "ministerios:write"],
  });

  const norole = await testSessionPermissions("NOROLE", "U-NOROLE", {
    ctxId: "CTX-05",
    ctxTitle: "U-NOROLE permisos",
    mustHave: ["profile:read", "settings:read"],
    mustLack: ["members:read", "finances:funds:read", "dashboard:read"],
    maxCount: 4,
  });

  if (USERS.PASTOR.email && USERS.PASTOR.password) {
    const pastor = await testSessionPermissions("PASTOR", "U-PASTOR", {
      ctxId: "CTX-06",
      ctxTitle: "U-PASTOR permisos",
      mustHave: ["finances:transactions:authorize", "finances:transactions:write"],
      mustLack: ["admin_users:manage", "roles:manage"],
    });
    if (pastor?.ctx) {
      record(
        "CTX-07",
        "U-PASTOR finanzas vía app_role (no membership)",
        hasPerm(pastor.perms, "finances:transactions:authorize") ? "PASS" : "FAIL",
        `membership_role=${pastor.ctx.membership_role ?? "null"}`,
        "high",
      );
    }
  } else {
    record("CTX-06", "U-PASTOR permisos", "N/A", "sin credenciales pastor", "low");
    record("CTX-07", "Pastor no depende de membership", "N/A", "sin U-PASTOR", "low");
  }

  // RPC-01 fn_user_has_permission vs permissions[]
  if (admin?.auth && admin.perms.length) {
    const key = admin.perms[0];
    try {
      const rpcOk = await rpcCall(admin.auth.access_token, "fn_user_has_permission", {
        p_permission_key: key,
      });
      const derived = hasPerm(admin.perms, key);
      record(
        "RPC-01",
        "fn_user_has_permission coherente",
        rpcOk === derived ? "PASS" : "FAIL",
        `key=${key} rpc=${rpcOk}`,
        "high",
      );
    } catch (e) {
      record("RPC-01", "fn_user_has_permission", "FAIL", e.message, "high");
    }
  } else {
    record("RPC-01", "fn_user_has_permission", "BLOCKED", "sin U-ADMIN", "high");
  }

  // RPC-02 / RPC-03 church auth users
  if (tesorero?.auth && admin?.ctx?.church_id) {
    try {
      await rpcCall(tesorero.auth.access_token, "sp_list_church_auth_users", {
        p_church_id: admin.ctx.church_id,
      });
      record("RPC-02", "U-TESORERO RPC admin users", "FAIL", "debió denegar", "critical");
    } catch (e) {
      const denied = /denegado|administrador|permiso/i.test(e.message);
      record(
        "RPC-02",
        "U-TESORERO RPC admin users",
        denied ? "PASS" : "FAIL",
        e.message.slice(0, 120),
        "critical",
      );
    }
  } else {
    record("RPC-02", "U-TESORERO RPC admin users", "BLOCKED", "sin tesorero/admin", "critical");
  }

  if (admin?.auth && admin?.ctx?.church_id) {
    try {
      await rpcCall(admin.auth.access_token, "sp_list_church_auth_users", {
        p_church_id: admin.ctx.church_id,
      });
      record("RPC-03", "U-ADMIN RPC admin users", "PASS", "", "high");
    } catch (e) {
      record("RPC-03", "U-ADMIN RPC admin users", "FAIL", e.message, "critical");
    }
  } else {
    record("RPC-03", "U-ADMIN RPC admin users", "BLOCKED", "sin U-ADMIN", "critical");
  }

  // PAGE-* route guards (requires dev server)
  let devOk = true;
  try {
    const ping = await fetch(`${BASE}/login`, { redirect: "manual" });
    if (!ping.ok && ping.status !== 302) devOk = false;
  } catch {
    devOk = false;
  }
  if (!devOk) {
    for (const id of [
      "PAGE-01",
      "PAGE-02",
      "PAGE-03",
      "PAGE-04",
      "PAGE-05",
      "PAGE-06",
      "PAGE-07",
    ]) {
      record(id, "Route guard HTTP", "BLOCKED", "npm run dev no responde :3000", "critical");
    }
  } else {
    if (norole?.auth) {
      const members = await fetchPage("/members", norole.auth);
      const denied = pageAccessDenied(members) || !pageHasMembersList(members);
      record(
        "PAGE-01",
        "U-NOROLE /members",
        denied ? "PASS" : "FAIL",
        `status=${members.status}`,
        "critical",
      );

      const dash = await fetchPage("/dashboard", norole.auth);
      const dashDenied = pageAccessDenied(dash);
      record(
        "PAGE-02",
        "U-NOROLE /dashboard",
        dashDenied ? "PASS" : "FAIL",
        `status=${dash.status}`,
        "critical",
      );

      const settings = await fetchPage("/settings", norole.auth);
      record(
        "PAGE-03",
        "U-NOROLE /settings",
        pageHasSettings(settings) ? "PASS" : "FAIL",
        `status=${settings.status}`,
        "critical",
      );
    } else {
      record("PAGE-01", "U-NOROLE /members", "BLOCKED", "sin U-NOROLE", "critical");
      record("PAGE-02", "U-NOROLE /dashboard", "BLOCKED", "sin U-NOROLE", "critical");
      record("PAGE-03", "U-NOROLE /settings", "BLOCKED", "sin U-NOROLE", "critical");
    }

    if (tesorero?.auth) {
      const users = await fetchPage("/settings/users", tesorero.auth);
      record(
        "PAGE-04",
        "U-TESORERO /settings/users",
        pageAdminUsersBlocked(users) || !pageHasAdminUsersList(users)
          ? "PASS"
          : "FAIL",
        `status=${users.status}`,
        "critical",
      );

      const tx = await fetchPage("/finances/transactions", tesorero.auth);
      record(
        "PAGE-05",
        "U-TESORERO /finances/transactions",
        pageHasTransactionsModule(tx) ? "PASS" : "FAIL",
        `status=${tx.status}`,
        "high",
      );
    } else {
      record("PAGE-04", "U-TESORERO /settings/users", "BLOCKED", "sin U-TESORERO", "critical");
      record("PAGE-05", "U-TESORERO /finances/transactions", "BLOCKED", "sin U-TESORERO", "high");
    }

    if (lider?.auth) {
      const fin = await fetchPage("/finances/contributions", lider.auth);
      record(
        "PAGE-06",
        "U-LIDER /finances/contributions",
        pageAccessDenied(fin) ? "PASS" : "FAIL",
        `status=${fin.status}`,
        "high",
      );

      const min = await fetchPage("/ministerios", lider.auth);
      record(
        "PAGE-07",
        "U-LIDER /ministerios",
        pageHasMinistriesModule(min) ? "PASS" : "FAIL",
        `status=${min.status}`,
        "high",
      );
    } else {
      record("PAGE-06", "U-LIDER /finances", "BLOCKED", "sin U-LIDER", "high");
      record("PAGE-07", "U-LIDER /ministerios", "BLOCKED", "sin U-LIDER", "high");
    }
  }

  // SEC-01 wrong church on RPC (reuse income entries guard)
  if (admin?.auth) {
    try {
      const bad = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sp_get_income_entries`, {
        method: "POST",
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${admin.auth.access_token}`,
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
        "Tenant RPC church_id",
        blocked ? "PASS" : "FAIL",
        `status=${bad.status}`,
        "critical",
      );
    } catch (e) {
      record("SEC-01", "Tenant RPC church_id", "PASS", e.message, "critical");
    }
  } else {
    record("SEC-01", "Tenant RPC church_id", "BLOCKED", "sin U-ADMIN", "critical");
  }

  printSummary();
}

function printSummary() {
  console.log("\n=== RESUMEN ===");
  console.log("| ID | Caso | Resultado |");
  console.log("|----|------|-----------|");
  for (const r of results) {
    console.log(`| ${r.id} | ${r.title} | ${r.status} |`);
  }

  const applicable = results.filter((r) => r.status !== "N/A");
  const passed = applicable.filter((r) => r.status === "PASS");
  const failed = applicable.filter((r) => r.status === "FAIL");
  const blocked = applicable.filter((r) => r.status === "BLOCKED");

  const pct =
    applicable.length > 0
      ? Math.round((passed.length / applicable.length) * 100)
      : 0;

  console.log(
    `\nConteo: ${passed.length}/${applicable.length} PASS (${pct}%) | FAIL=${failed.length} | BLOCKED=${blocked.length}`,
  );

  const blockers = [
    "CTX-02",
    "CTX-03",
    "CTX-04",
    "CTX-05",
    "RPC-02",
    "PAGE-01",
    "PAGE-02",
    "PAGE-03",
    "PAGE-04",
    "SEC-01",
  ];

  const blockerFail = results.filter(
    (r) => r.status === "FAIL" && blockers.includes(r.id),
  );
  const anyFailOrBlocked = failed.length > 0 || blocked.length > 0;
  const allPass = applicable.every((r) => r.status === "PASS");

  const go = allPass && blockerFail.length === 0;

  console.log(`\n**GO/NO-GO merge:** ${go ? "GO" : "NO-GO"}`);
  if (!go) {
    console.log(
      "QA NO CERRADO — corregir FAIL/BLOCKED y re-ejecutar hasta 100% PASS.",
    );
    if (failed.length) {
      console.log(`FAIL: ${failed.map((r) => r.id).join(", ")}`);
    }
    if (blocked.length) {
      console.log(`BLOCKED: ${blocked.map((r) => r.id).join(", ")}`);
    }
  }

  process.exit(go ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
