import type { Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type QaRole = "ADMIN" | "TESORERO" | "LIDER" | "NOROLE" | "PASTOR";

function loadEnvLocal(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnvLocal();

const ROLE_ENV: Record<QaRole, { emailKey: string; passwordKey: string }> = {
  ADMIN: { emailKey: "QA_RBAC_ADMIN_EMAIL", passwordKey: "QA_RBAC_ADMIN_PASSWORD" },
  TESORERO: { emailKey: "QA_RBAC_TESORERO_EMAIL", passwordKey: "QA_RBAC_TESORERO_PASSWORD" },
  LIDER: { emailKey: "QA_RBAC_LIDER_EMAIL", passwordKey: "QA_RBAC_LIDER_PASSWORD" },
  NOROLE: { emailKey: "QA_RBAC_NOROLE_EMAIL", passwordKey: "QA_RBAC_NOROLE_PASSWORD" },
  PASTOR: { emailKey: "QA_RBAC_PASTOR_EMAIL", passwordKey: "QA_RBAC_PASTOR_PASSWORD" },
};

export function credsFor(role: QaRole): { email: string; password: string } | null {
  const keys = ROLE_ENV[role];
  const email = env[keys.emailKey];
  const password = env[keys.passwordKey];
  if (!email || !password) return null;
  return { email, password };
}

function stringToBase64URL(str: string) {
  return Buffer.from(str, "utf8").toString("base64url");
}

async function signIn(email: string, password: string) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing Supabase env");

  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error_description ?? body.msg ?? res.status);
  return body;
}

function supabaseCookieName() {
  const ref = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
  return ref ? `sb-${ref}-auth-token` : null;
}

export async function loginAs(page: Page, role: QaRole) {
  const creds = credsFor(role);
  if (!creds) throw new Error(`Missing credentials for ${role} in .env.local`);

  const auth = await signIn(creds.email, creds.password);
  const cookieName = supabaseCookieName();
  if (!cookieName) throw new Error("Cannot derive Supabase cookie name");

  const session = {
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    expires_in: auth.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + (auth.expires_in ?? 3600),
    token_type: auth.token_type ?? "bearer",
    user: auth.user,
  };
  const encoded = `base64-${stringToBase64URL(JSON.stringify(session))}`;

  await page.context().addCookies([
    {
      name: cookieName,
      value: encodeURIComponent(encoded),
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

export async function rbacImplemented(): Promise<boolean> {
  const creds = credsFor("ADMIN");
  if (!creds) return false;
  try {
    const auth = await signIn(creds.email, creds.password);
    const url = env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const res = await fetch(`${url}/rest/v1/rpc/sp_get_session_context`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${auth.access_token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const ctx = await res.json();
    return Array.isArray(ctx?.permissions);
  } catch {
    return false;
  }
}

export async function sidebarLinkVisible(page: Page, label: string): Promise<boolean> {
  const link = page.locator("aside.sidebar").getByRole("link", { name: label, exact: true });
  return link.isVisible().catch(() => false);
}

export async function expandNavGroup(page: Page, label: string) {
  const parent = page.locator("aside.sidebar .nav-parent").filter({ hasText: label });
  if (await parent.count()) await parent.first().click();
}

export async function sidebarHrefVisible(page: Page, href: string): Promise<boolean> {
  return page
    .locator(`aside.sidebar a[href="${href}"]`)
    .first()
    .isVisible()
    .catch(() => false);
}

export async function pageDenied(page: Page, path: string): Promise<boolean> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page
    .waitForURL(/\/settings(\?|$)/, { timeout: 5000 })
    .catch(() => undefined);
  const url = page.url();
  const basePath = path.split("?")[0];
  if (!url.includes(basePath) && path.startsWith("/members")) {
    return true;
  }
  if (
    url.includes("/settings") &&
    !path.startsWith("/settings") &&
    !path.startsWith("/members/profile")
  ) {
    return true;
  }
  if (url.includes("denied=1")) return true;
  const denied = page.getByText(/acceso denegado|no tienes permiso|se requiere rol/i);
  if (await denied.isVisible().catch(() => false)) return true;
  if (path.startsWith("/settings/users")) {
    return page.getByText(/solo un administrador|acceso denegado/i).isVisible().catch(() => false);
  }
  if (path.startsWith("/members")) {
    const hasList = await page
      .getByText(/Miembros registrados|filter-toolbar/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasNewBtn = await page
      .getByRole("button", { name: /Nuevo miembro/i })
      .isVisible()
      .catch(() => false);
    return !(hasList || hasNewBtn);
  }
  if (path.startsWith("/dashboard")) {
    return !(await page.getByText(/Buenos días|Total de Miembros/i).first().isVisible().catch(() => false));
  }
  if (path.startsWith("/finances")) {
    return !(await page.getByText(/Contribuciones|Transacciones|Fondos/i).first().isVisible().catch(() => false));
  }
  return false;
}
