import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export const QA_RBAC_BASE = "http://localhost:3000";

export function loadEnv(cwd = process.cwd()) {
  const path = resolve(cwd, ".env.local");
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

export function getSupabaseConfig(env = loadEnv()) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const projectRef = url?.match(/https:\/\/([^.]+)/)?.[1] ?? null;
  return { url, anonKey, serviceRoleKey, projectRef };
}

export function getQaRbacUsers(env = loadEnv()) {
  return {
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
}

export function stringToBase64URL(str) {
  return Buffer.from(str, "utf8").toString("base64url");
}

export function cookieHeaderFromAuthBody(authBody, projectRef) {
  const session = {
    access_token: authBody.access_token,
    refresh_token: authBody.refresh_token,
    expires_in: authBody.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + (authBody.expires_in ?? 3600),
    token_type: authBody.token_type ?? "bearer",
    user: authBody.user,
  };
  const encoded = `base64-${stringToBase64URL(JSON.stringify(session))}`;
  const name = `sb-${projectRef}-auth-token`;
  const value = encodeURIComponent(encoded);
  return { name, value, header: `${name}=${value}` };
}

export async function signIn(email, password, env = loadEnv()) {
  const { url, anonKey } = getSupabaseConfig(env);
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error_description ?? body.msg ?? String(res.status));
  }
  return body;
}

export async function rpcCall(accessToken, fn, body = {}, env = loadEnv()) {
  const { url, anonKey } = getSupabaseConfig(env);
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
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

export async function fetchPage(path, authBody, env = loadEnv()) {
  const { projectRef } = getSupabaseConfig(env);
  const { header } = cookieHeaderFromAuthBody(authBody, projectRef);
  const res = await fetch(`${QA_RBAC_BASE}${path}`, {
    headers: { Cookie: header },
    redirect: "manual",
  });
  const text = await res.text();
  return {
    status: res.status,
    text,
    location: res.headers.get("location"),
  };
}

export async function isDevServerUp(base = QA_RBAC_BASE) {
  try {
    const res = await fetch(`${base}/login`, { redirect: "manual" });
    return res.status === 200 || res.status === 302;
  } catch {
    return false;
  }
}

export async function waitForDevServer(base = QA_RBAC_BASE, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isDevServerUp(base)) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

export function permissionsFromContext(ctx) {
  const p = ctx?.permissions;
  if (Array.isArray(p)) return p.map(String);
  return [];
}

export async function rbacMigrationApplied(env = loadEnv()) {
  const users = getQaRbacUsers(env);
  const creds = users.ADMIN;
  if (!creds.email || !creds.password) return false;
  try {
    const auth = await signIn(creds.email, creds.password, env);
    const ctx = await rpcCall(auth.access_token, "sp_get_session_context", {}, env);
    return Array.isArray(ctx?.permissions);
  } catch {
    return false;
  }
}
