#!/usr/bin/env node
/**
 * Provision QA users for RBAC sprint.
 * Run: node scripts/seed-rbac-qa-users.mjs [--write-env]
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_* in .env.local
 * Optional: QA_RBAC_SEED_ADMIN_EMAIL (source church; default maxseipio@gmail.com)
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { getSupabaseConfig, loadEnv } from "./lib/qa-env.mjs";

const DEFAULT_PASSWORD = "QaRbac!2026";
const DOMAIN = "evochurch.qa";

const ROLE_SPECS = [
  { envPrefix: "QA_RBAC_ADMIN", suffix: "admin", appRoleId: 1, firstName: "QA", lastName: "Admin" },
  { envPrefix: "QA_RBAC_TESORERO", suffix: "tesorero", appRoleId: 3, firstName: "QA", lastName: "Tesorero" },
  { envPrefix: "QA_RBAC_LIDER", suffix: "lider", appRoleId: 10, firstName: "QA", lastName: "Lider" },
  { envPrefix: "QA_RBAC_NOROLE", suffix: "norole", appRoleId: null, firstName: "QA", lastName: "SinRol" },
  { envPrefix: "QA_RBAC_PASTOR", suffix: "pastor", appRoleId: 4, firstName: "QA", lastName: "Pastor" },
];

function emailFor(suffix, churchId) {
  return `qa-rbac-${suffix}-${churchId}@${DOMAIN}`;
}

async function findAuthUserIdByEmail(admin, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match.id;
    if (!data.users.length || data.users.length < 200) break;
  }
  return null;
}

async function main() {
  const writeEnv = process.argv.includes("--write-env");
  const env = loadEnv();
  const { url, serviceRoleKey } = getSupabaseConfig(env);

  if (!url || !serviceRoleKey) {
    console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  const seedAdminEmail =
    env.QA_RBAC_SEED_ADMIN_EMAIL || "maxseipio@gmail.com";

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  });

  const { data: seedRow, error: seedErr } = await admin
    .from("auth_users")
    .select("id, profile_id, profiles!inner(church_id, first_name)")
    .eq("email", seedAdminEmail)
    .maybeSingle();

  if (seedErr || !seedRow?.profiles?.church_id) {
    console.error(
      "No se encontró admin semilla:",
      seedAdminEmail,
      seedErr?.message ?? "sin perfil/iglesia",
    );
    process.exit(1);
  }

  const churchId = seedRow.profiles.church_id;
  console.log(`Iglesia semilla: church_id=${churchId} (admin: ${seedAdminEmail})\n`);

  const envLines = [];
  const password = env.QA_RBAC_DEFAULT_PASSWORD || DEFAULT_PASSWORD;

  for (const spec of ROLE_SPECS) {
    const email = emailFor(spec.suffix, churchId);
    envLines.push(`${spec.envPrefix}_EMAIL=${email}`);
    envLines.push(`${spec.envPrefix}_PASSWORD=${password}`);

    let authUserId = null;

    const { data: existingByEmail } = await admin
      .from("auth_users")
      .select("id, profile_id")
      .eq("email", email)
      .maybeSingle();

    if (existingByEmail?.id) {
      authUserId = existingByEmail.id;
      await admin.auth.admin.updateUserById(authUserId, { password });
      console.log(`✓ Auth existente: ${email}`);
    } else {
      authUserId = await findAuthUserIdByEmail(admin, email);
      if (authUserId) {
        await admin.auth.admin.updateUserById(authUserId, { password });
        console.log(`✓ Auth en Supabase (sin auth_users): ${email}`);
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (createErr || !created.user) {
          console.error(`✗ Crear auth ${email}:`, createErr?.message ?? "unknown");
          continue;
        }
        authUserId = created.user.id;
        console.log(`✓ Auth creado: ${email}`);
      }
    }

    const { data: existingAu } = await admin
      .from("auth_users")
      .select("id, profile_id")
      .eq("id", authUserId)
      .maybeSingle();

    let profileId = existingByEmail?.profile_id ?? existingAu?.profile_id ?? null;

    if (!profileId) {
      profileId = crypto.randomUUID();
      const { error: profileErr } = await admin.from("profiles").insert({
        id: profileId,
        church_id: churchId,
        first_name: spec.firstName,
        last_name: spec.lastName,
        is_active: true,
        is_member: false,
      });
      if (profileErr) {
        console.error(`✗ Profile ${email}:`, profileErr.message);
        continue;
      }
      console.log(`  + profile ${profileId}`);
    }

    const authUsersPayload = {
      id: authUserId,
      email,
      profile_id: profileId,
      oauth_provider: "EMAIL",
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0,
      app_role_id: spec.appRoleId,
      updated_at: new Date().toISOString(),
    };

    if (existingAu) {
      const { error: updErr } = await admin
        .from("auth_users")
        .update({ app_role_id: spec.appRoleId, is_active: true, updated_at: authUsersPayload.updated_at })
        .eq("id", authUserId);
      if (updErr) {
        console.error(`✗ Update auth_users ${email}:`, updErr.message);
        continue;
      }
    } else {
      authUsersPayload.created_at = new Date().toISOString();
      const { error: insErr } = await admin.from("auth_users").insert(authUsersPayload);
      if (insErr) {
        console.error(`✗ Insert auth_users ${email}:`, insErr.message);
        continue;
      }
    }

    console.log(`  → app_role_id=${spec.appRoleId ?? "NULL"}`);

    if (spec.suffix === "lider") {
      await ensureMinistryFixtures(admin, churchId, profileId, env, envLines);
    }
  }

  console.log("\n--- Variables para .env.local ---\n");
  console.log(`QA_RBAC_DEFAULT_PASSWORD=${password}`);
  for (const line of envLines) console.log(line);

  if (writeEnv) {
    mergeEnvLocal(envLines, password);
    console.log("\n✓ .env.local actualizado (QA_RBAC_*).");
  } else {
    console.log("\nTip: node scripts/seed-rbac-qa-users.mjs --write-env");
  }
}

async function ensureMinistryFixtures(admin, churchId, liderProfileId, env, envLines) {
  if (env.QA_RBAC_MINISTRY_OWN_ID && env.QA_RBAC_MINISTRY_OTHER_ID) {
    envLines.push(`QA_RBAC_MINISTRY_OWN_ID=${env.QA_RBAC_MINISTRY_OWN_ID}`);
    envLines.push(`QA_RBAC_MINISTRY_OTHER_ID=${env.QA_RBAC_MINISTRY_OTHER_ID}`);
    return;
  }

  const { data: ministries } = await admin
    .from("church_ministries")
    .select("id, leader_profile_ids, name")
    .eq("church_id", churchId)
    .limit(20);

  if (!ministries?.length) {
    console.log("  ⚠ Sin ministerios — crea M-OWN/M-OTHER manualmente para ABAC E2E");
    return;
  }

  const other = ministries.find(
    (m) => !Array.isArray(m.leader_profile_ids) || !m.leader_profile_ids.includes(liderProfileId),
  );
  let own = ministries.find(
    (m) => Array.isArray(m.leader_profile_ids) && m.leader_profile_ids.includes(liderProfileId),
  );

  if (!own && other) {
    const ids = Array.isArray(other.leader_profile_ids) ? [...other.leader_profile_ids] : [];
    if (!ids.includes(liderProfileId)) ids.push(liderProfileId);
    await admin.from("church_ministries").update({ leader_profile_ids: ids }).eq("id", other.id);
    own = { ...other, leader_profile_ids: ids };
    console.log(`  + U-LIDER asignado líder en ministerio ${other.name}`);
  }

  if (own) {
    console.log(`  QA_RBAC_MINISTRY_OWN_ID=${own.id}`);
    envLines.push(`QA_RBAC_MINISTRY_OWN_ID=${own.id}`);
  }
  const otherMin = ministries.find((m) => m.id !== own?.id);
  if (otherMin) {
    console.log(`  QA_RBAC_MINISTRY_OTHER_ID=${otherMin.id}`);
    envLines.push(`QA_RBAC_MINISTRY_OTHER_ID=${otherMin.id}`);
  }
}

function mergeEnvLocal(newLines, password) {
  const path = resolve(process.cwd(), ".env.local");
  const keys = new Set(newLines.map((l) => l.split("=")[0]));
  keys.add("QA_RBAC_DEFAULT_PASSWORD");
  keys.add("QA_RBAC_MINISTRY_OWN_ID");
  keys.add("QA_RBAC_MINISTRY_OTHER_ID");

  let existing = "";
  if (existsSync(path)) {
    existing = readFileSync(path, "utf8");
  }

  const kept = existing
    .split("\n")
    .filter((line) => {
      const m = line.match(/^([A-Z0-9_]+)=/);
      return !m || !keys.has(m[1]);
    })
    .filter((line, i, arr) => !(line === "" && arr[i + 1] === ""));

  const block = [
    "",
    "# --- QA RBAC (generado por seed-rbac-qa-users.mjs) ---",
    `QA_RBAC_DEFAULT_PASSWORD=${password}`,
    ...newLines,
    "",
  ];

  writeFileSync(path, [...kept, ...block].join("\n").replace(/\n{3,}/g, "\n\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
