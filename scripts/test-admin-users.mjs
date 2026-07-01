/**
 * Smoke test: login + admin users RPCs (fetch-only, no WebSocket).
 * Run: node --env-file=.env.local scripts/test-admin-users.mjs
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.TEST_USER_EMAIL ?? "maxseipio@gmail.com";
const password = process.env.TEST_USER_PASSWORD ?? "admin2026";

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

async function rpc(accessToken, fn, params = {}) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${fn}: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

console.log("1. Login as", email);
const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: {
    apikey: anonKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password }),
});
const loginJson = await loginRes.json();
if (!loginRes.ok || !loginJson.access_token) {
  console.error("Login failed:", loginJson.error_description ?? loginJson.msg ?? loginJson);
  process.exit(1);
}
const token = loginJson.access_token;
const userId = loginJson.user?.id;
console.log("   OK — user id:", userId);

console.log("2. sp_get_session_context");
const ctx = await rpc(token, "sp_get_session_context");
assert(ctx?.app_role_id === 1, `Expected app_role_id=1, got ${ctx?.app_role_id}`);
console.log("   OK — role:", ctx.app_role_name, "church:", ctx.church_id);

const churchId = Number(ctx.church_id);

console.log("3. fn_can_manage_admin_users");
const canManage = await rpc(token, "fn_can_manage_admin_users");
assert(canManage === true, "Expected can manage admin users");
console.log("   OK");

console.log("4. sp_list_app_user_roles");
const roles = await rpc(token, "sp_list_app_user_roles");
assert(Array.isArray(roles) && roles.length > 0, "Expected roles array");
console.log("   OK —", roles.length, "roles");

console.log("5. sp_list_church_auth_users");
const list = await rpc(token, "sp_list_church_auth_users", {
  p_church_id: churchId,
});
assert(list?.success === true, "Expected success list response");
assert(Array.isArray(list.users), "Expected users array");
console.log("   OK —", list.users.length, "user(s)");

console.log("6. sp_update_church_auth_user (noop role refresh)");
const updated = await rpc(token, "sp_update_church_auth_user", {
  p_church_id: churchId,
  p_auth_user_id: userId,
  p_app_role_id: 1,
  p_clear_app_role: false,
});
assert(updated?.success === true, "Update should succeed for admin");
console.log("   OK");

console.log("\nAll admin users module checks passed.");
