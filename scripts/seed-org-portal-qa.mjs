#!/usr/bin/env node
/**
 * Seed portal concilio (Fase 3) — Concilio Evangélico ADG República Dominicana.
 *
 * Run: node scripts/seed-org-portal-qa.mjs [--write-env]
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_* in .env.local
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { getSupabaseConfig, loadEnv } from "./lib/qa-env.mjs";

const DEFAULT_EMAIL = "maxseipio@gmail.com";
const DEFAULT_PASSWORD = "admin2026";
const ORG_SLUG = "adg-rd";

const ORG = {
  name: "Concilio Evangélico de las Asambleas de Dios de la República Dominicana, Inc.",
  slug: ORG_SLUG,
  logo_url: "https://www.concilioad.org/content/images/logo.png",
  primary_color: "#1B3A6B",
  secondary_color: "#C41E3A",
  accent_color: "#D4AF37",
  report_rules: {
    cead: {
      church_tithe_percent: 10,
      ibcr_percent: 3,
      christian_education_percent: 1,
      fpj_percent: 1,
    },
    f001: {
      council_header:
        "Concilio Evangélico de las Asambleas de Dios de la República Dominicana, Inc. — Autopista Duarte Km 12½, Alameda, Santo Domingo Oeste 11103",
      due_day: 10,
      superintendent: "Rev. Julio Morales",
      national_secretary: "Rev. Rafael Peña Pilarte",
      contact_phone: "+1 (809) 564-3454",
      contact_email: "info@concilioad.org",
      website: "https://www.concilioad.org",
    },
  },
};

const DISTRICTS = [
  { code: "MET", name: "Distrito Metropolitano" },
  { code: "NOR", name: "Distrito Norte (Cibao)" },
  { code: "SUR", name: "Distrito Sur" },
  { code: "EST", name: "Distrito Este" },
  { code: "NOE", name: "Distrito Noroeste" },
];

/** Iglesias de demostración (nombres ficticios; códigos estilo ADG). */
const SAMPLE_CHURCHES = [
  {
    slug: "adg-central-alameda",
    name: "Iglesia Central Asambleas de Dios — Alameda",
    short_name: "Central ADG",
    address: "Autopista Duarte Km 12½, Alameda",
    contact_phone: "8095643454",
    contact_email: "central@concilioad.org",
    city: "Santo Domingo Oeste",
    province: "Santo Domingo",
    external_code: "ADG-001",
    presbytery_name: "Presbiterio Metropolitano",
    districtCode: "MET",
    billing_plan: "enterprise",
    billing_status: "active",
  },
  {
    slug: "adg-peniel-santiago",
    name: "Iglesia Peniel Asambleas de Dios",
    short_name: "Peniel",
    address: "Av. Estrella Sadhalá esq. Calle 30 de Marzo",
    contact_phone: "8095801200",
    contact_email: "peniel.adg@example.do",
    city: "Santiago de los Caballeros",
    province: "Santiago",
    external_code: "ADG-025",
    presbytery_name: "Presbiterio Santiago",
    districtCode: "NOR",
    billing_plan: "standard",
    billing_status: "active",
  },
  {
    slug: "adg-betel-la-romana",
    name: "Iglesia Betel Asambleas de Dios",
    short_name: "Betel",
    address: "Calle Padre Abreu Km 1",
    contact_phone: "8095503300",
    contact_email: "betel.adg@example.do",
    city: "La Romana",
    province: "La Romana",
    external_code: "ADG-041",
    presbytery_name: "Presbiterio La Romana",
    districtCode: "EST",
    billing_plan: "standard",
    billing_status: "active",
  },
  {
    slug: "adg-calvario-san-cristobal",
    name: "Iglesia El Calvario Asambleas de Dios",
    short_name: "El Calvario",
    address: "Calle Sánchez esq. Mella",
    contact_phone: "8095294400",
    contact_email: "calvario.adg@example.do",
    city: "San Cristóbal",
    province: "San Cristóbal",
    external_code: "ADG-055",
    presbytery_name: "Presbiterio Sur",
    districtCode: "SUR",
    billing_plan: "standard",
    billing_status: "past_due",
  },
  {
    slug: "adg-getsemani-puerto-plata",
    name: "Iglesia Getsemaní Asambleas de Dios",
    short_name: "Getsemaní",
    address: "Calle Beller esq. 16 de Agosto",
    contact_phone: "8095867700",
    contact_email: "getsemani.adg@example.do",
    city: "Puerto Plata",
    province: "Puerto Plata",
    external_code: "ADG-062",
    presbytery_name: "Presbiterio Noroeste",
    districtCode: "NOE",
    billing_plan: "trial",
    billing_status: "active",
  },
];

const LINK_EXISTING_CHURCH = {
  id: 1,
  external_code: "ADG-071",
  presbytery_name: "Presbiterio Este",
  districtCode: "EST",
};

function monthAgo(offset = 1) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
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

async function ensureAuthUser(admin, email, password) {
  const { data: existing } = await admin
    .from("auth_users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  let authUserId = existing?.id ?? (await findAuthUserIdByEmail(admin, email));

  if (authUserId) {
    await admin.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
    });
    console.log(`✓ Auth actualizado: ${email}`);
    return authUserId;
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Maximiliano Seipio Martins" },
  });
  if (error || !created.user) {
    throw new Error(`No se pudo crear auth user: ${error?.message ?? "unknown"}`);
  }
  console.log(`✓ Auth creado: ${email}`);
  return created.user.id;
}

async function ensureOrganization(admin) {
  const { data: existing } = await admin
    .from("organization")
    .select("id, slug")
    .eq("slug", ORG_SLUG)
    .maybeSingle();

  const payload = {
  ...ORG,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await admin
      .from("organization")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw error;
    console.log(`✓ Organización actualizada: id=${data.id}`);
    return data.id;
  }

  const { data, error } = await admin
    .from("organization")
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`✓ Organización creada: id=${data.id}`);
  return data.id;
}

async function ensureDistricts(admin, organizationId) {
  const byCode = new Map();

  for (const district of DISTRICTS) {
    const { data: existing } = await admin
      .from("org_unit")
      .select("id, code")
      .eq("organization_id", organizationId)
      .eq("code", district.code)
      .maybeSingle();

    if (existing?.id) {
      await admin
        .from("org_unit")
        .update({ name: district.name })
        .eq("id", existing.id);
      byCode.set(district.code, existing.id);
      continue;
    }

    const { data, error } = await admin
      .from("org_unit")
      .insert({
        organization_id: organizationId,
        name: district.name,
        code: district.code,
      })
      .select("id")
      .single();
    if (error) throw error;
    byCode.set(district.code, data.id);
  }

  console.log(`✓ Distritos: ${DISTRICTS.length}`);
  return byCode;
}

async function upsertChurch(admin, organizationId, districtByCode, spec) {
  const { data: existing } = await admin
    .from("church")
    .select("id")
    .eq("slug", spec.slug)
    .maybeSingle();

  const orgUnitId = districtByCode.get(spec.districtCode) ?? null;
  const row = {
    name: spec.name,
    short_name: spec.short_name,
    slug: spec.slug,
    address: spec.address,
    contact_phone: spec.contact_phone,
    contact_email: spec.contact_email,
    church_kind: "standalone",
    organization_id: organizationId,
    org_unit_id: orgUnitId,
    city: spec.city,
    province: spec.province,
    country: "República Dominicana",
    country_code: "DO",
    external_code: spec.external_code,
    presbytery_name: spec.presbytery_name,
    billing_plan: spec.billing_plan,
    billing_status: spec.billing_status,
    main_organization: ORG.name,
    timezone: "America/Santo_Domingo",
    default_locale: "es",
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await admin
      .from("church")
      .update(row)
      .eq("id", existing.id)
      .select("id, name")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await admin
    .from("church")
    .insert({ ...row, created_at: new Date().toISOString() })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

async function linkExistingChurch(admin, organizationId, districtByCode) {
  const orgUnitId = districtByCode.get(LINK_EXISTING_CHURCH.districtCode) ?? null;
  const { data, error } = await admin
    .from("church")
    .update({
      organization_id: organizationId,
      org_unit_id: orgUnitId,
      external_code: LINK_EXISTING_CHURCH.external_code,
      presbytery_name: LINK_EXISTING_CHURCH.presbytery_name,
      main_organization: ORG.name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", LINK_EXISTING_CHURCH.id)
    .select("id, name")
    .single();
  if (error) throw error;
  console.log(`✓ Iglesia existente vinculada: ${data.name} (id=${data.id})`);
  return data;
}

async function ensureMembership(admin, organizationId, authUserId) {
  const { data: existing } = await admin
    .from("org_membership")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  const row = {
    organization_id: organizationId,
    auth_user_id: authUserId,
    app_role_key: "council_admin",
    is_active: true,
    org_unit_id: null,
  };

  if (existing?.id) {
    const { error } = await admin.from("org_membership").update(row).eq("id", existing.id);
    if (error) throw error;
    console.log("✓ Membresía org actualizada (council_admin)");
    return;
  }

  const { error } = await admin.from("org_membership").insert(row);
  if (error) throw error;
  console.log("✓ Membresía org creada (council_admin)");
}

async function ensureSubmittedReports(admin, organizationId, churches, profileId) {
  const samples = [
  { churchId: churches[0]?.id, ...monthAgo(1) },
  { churchId: churches[1]?.id, ...monthAgo(1) },
  { churchId: churches[0]?.id, ...monthAgo(2) },
  { churchId: churches[2]?.id, ...monthAgo(1) },
  { churchId: churches.find((c) => c.slug === "fuente-inagotable")?.id, ...monthAgo(2) },
  ].filter((s) => s.churchId);

  let inserted = 0;
  for (const sample of samples) {
    const { data: existing } = await admin
      .from("org_submitted_report")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("church_id", sample.churchId)
      .eq("period_year", sample.year)
      .eq("period_month", sample.month)
      .eq("report_kind", "concilio_f001")
      .maybeSingle();

    if (existing?.id) continue;

    const { error } = await admin.from("org_submitted_report").insert({
      organization_id: organizationId,
      church_id: sample.churchId,
      period_year: sample.year,
      period_month: sample.month,
      report_kind: "concilio_f001",
      payload: {
        source: "seed-org-portal-qa",
        form: "F.001",
        period: `${sample.year}-${String(sample.month).padStart(2, "0")}`,
        totals: {
          general_income: 125000,
          ministry_income: 18000,
          church_expenses: 98000,
        },
      },
      submitted_by_profile_id: profileId ?? null,
    });
    if (error) throw error;
    inserted += 1;
  }

  console.log(`✓ Reportes F.001 de muestra: ${inserted} nuevos`);
}

function mergeEnvLocal(lines) {
  const path = resolve(process.cwd(), ".env.local");
  const keys = new Set(lines.map((l) => l.split("=")[0]));
  keys.add("QA_ORG_DEFAULT_PASSWORD");
  keys.add("QA_ORG_ADMIN_EMAIL");
  keys.add("QA_ORG_ADMIN_PASSWORD");
  keys.add("QA_ORG_SLUG");
  keys.add("QA_ORG_ID");

  let existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const kept = existing
    .split("\n")
    .filter((line) => {
      const m = line.match(/^([A-Z0-9_]+)=/);
      return !m || !keys.has(m[1]);
    })
    .filter((line, i, arr) => !(line === "" && arr[i + 1] === ""));

  const block = [
    "",
    "# --- QA Org Portal (generado por seed-org-portal-qa.mjs) ---",
    ...lines,
    "",
  ];

  writeFileSync(path, [...kept, ...block].join("\n").replace(/\n{3,}/g, "\n\n"));
}

async function main() {
  const writeEnv = process.argv.includes("--write-env");
  const env = loadEnv();
  const { url, serviceRoleKey } = getSupabaseConfig(env);

  if (!url || !serviceRoleKey) {
    console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  const email = env.QA_ORG_ADMIN_EMAIL || DEFAULT_EMAIL;
  const password = env.QA_ORG_ADMIN_PASSWORD || DEFAULT_PASSWORD;

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  });

  console.log(`Sembrando portal concilio ADG para ${email}\n`);

  const authUserId = await ensureAuthUser(admin, email, password);

  const { data: authRow } = await admin
    .from("auth_users")
    .select("profile_id")
    .eq("id", authUserId)
    .maybeSingle();

  const organizationId = await ensureOrganization(admin);
  const districtByCode = await ensureDistricts(admin, organizationId);
  await linkExistingChurch(admin, organizationId, districtByCode);

  const seededChurches = [];
  for (const spec of SAMPLE_CHURCHES) {
    const church = await upsertChurch(admin, organizationId, districtByCode, spec);
    seededChurches.push({ ...church, slug: spec.slug });
    console.log(`✓ Iglesia: ${church.name}`);
  }

  const { data: linkedExisting } = await admin
    .from("church")
    .select("id, name, slug")
    .eq("id", LINK_EXISTING_CHURCH.id)
    .single();
  if (linkedExisting) seededChurches.push(linkedExisting);

  await ensureMembership(admin, organizationId, authUserId);
  await ensureSubmittedReports(
    admin,
    organizationId,
    seededChurches,
    authRow?.profile_id ?? null,
  );

  const envLines = [
    `QA_ORG_DEFAULT_PASSWORD=${password}`,
    `QA_ORG_ADMIN_EMAIL=${email}`,
    `QA_ORG_ADMIN_PASSWORD=${password}`,
    `QA_ORG_SLUG=${ORG_SLUG}`,
    `QA_ORG_ID=${organizationId}`,
  ];

  console.log("\n--- Acceso portal concilio ---\n");
  console.log(`URL:      http://localhost:3000/org/login`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Org:      ${ORG.name} (id=${organizationId})`);

  console.log("\n--- Variables para .env.local ---\n");
  for (const line of envLines) console.log(line);

  if (writeEnv) {
    mergeEnvLocal(envLines);
    console.log("\n✓ .env.local actualizado (QA_ORG_*).");
  } else {
    console.log("\nTip: node scripts/seed-org-portal-qa.mjs --write-env");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
