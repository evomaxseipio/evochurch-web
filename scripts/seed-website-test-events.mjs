#!/usr/bin/env node
/**
 * Seed / remove test events for public website integration.
 *
 * Seed:   node scripts/seed-website-test-events.mjs
 * Clean:  node scripts/seed-website-test-events.mjs --clean
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local
 * Optional: WEBSITE_TEST_CHURCH_ID (defaults to church of QA_RBAC_SEED_ADMIN_EMAIL)
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { getSupabaseConfig, loadEnv } from "./lib/qa-env.mjs";

const MARKER = "[TEST-WEBSITE]";

function daysUntilNextSunday(from = new Date()) {
  const dow = from.getDay();
  return dow === 0 ? 0 : 7 - dow;
}

const TEST_EVENTS = [
  {
    title: `${MARKER} Culto Dominical`,
    description: "Culto de prueba — featured, aparece primero en el carrusel.",
    location: "Templo principal",
    event_type: "culto",
    daysFromNow: daysUntilNextSunday(),
    hour: 9,
    is_website_listed: true,
    is_website_promoted: false,
    is_featured: true,
  },
  {
    title: `${MARKER} Conferencia Fuente Viva 2026`,
    description: "Evento de prueba para el sitio web.",
    location: "Templo principal",
    event_type: "evento",
    daysFromNow: 14,
    hour: 18,
    is_website_listed: true,
    is_website_promoted: true,
    is_featured: false,
  },
  {
    title: `${MARKER} Retiro de Jóvenes Fuego Vivo`,
    description: "Evento de prueba listado en web.",
    location: "Centro juvenil",
    event_type: "evento",
    daysFromNow: 28,
    hour: 15,
    is_website_listed: true,
    is_website_promoted: true,
    is_featured: false,
  },
  {
    title: `${MARKER} Conexión 2026 — El Maestro te llama`,
    description: "Evento de prueba solo en carrusel (sin header).",
    location: "Nacional",
    event_type: "evento",
    daysFromNow: 21,
    hour: 19,
    is_website_listed: true,
    is_website_promoted: false,
    is_featured: false,
  },
  {
    title: `${MARKER} Día de la Gran Comisión`,
    description: "Evento de prueba solo en carrusel.",
    location: "Comunidad",
    event_type: "evento",
    daysFromNow: 35,
    hour: 9,
    is_website_listed: true,
    is_website_promoted: false,
    is_featured: false,
  },
  {
    title: `${MARKER} Encuentros Pastorales MDLA`,
    description: "Quinto evento de prueba en carrusel.",
    location: "Nacional",
    event_type: "estudio",
    daysFromNow: 42,
    hour: 19,
    is_website_listed: true,
    is_website_promoted: false,
    is_featured: false,
  },
  {
    title: `${MARKER} Vigilia de Oración (sin web)`,
    description: "No debe aparecer en el sitio público.",
    location: "Templo",
    event_type: "culto",
    daysFromNow: 10,
    hour: 22,
    is_website_listed: false,
    is_website_promoted: false,
    is_featured: false,
  },
];

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

function toTime(hour) {
  return `${String(hour).padStart(2, "0")}:00:00`;
}

async function resolveChurch(admin, env) {
  const fromEnv = Number(env.WEBSITE_TEST_CHURCH_ID || env.NEXT_PUBLIC_CHURCH_ID || 0);
  if (fromEnv > 0) return fromEnv;

  const seedEmail = env.QA_RBAC_SEED_ADMIN_EMAIL || "maxseipio@gmail.com";
  const { data, error } = await admin
    .from("auth_users")
    .select("profiles!inner(church_id)")
    .eq("email", seedEmail)
    .maybeSingle();

  if (error) throw error;
  const churchId = data?.profiles?.church_id;
  if (!churchId) {
    throw new Error(
      `No church_id found. Set WEBSITE_TEST_CHURCH_ID or QA_RBAC_SEED_ADMIN_EMAIL (${seedEmail}).`,
    );
  }
  return churchId;
}

async function resolveProfileId(admin, churchId, env) {
  const seedEmail = env.QA_RBAC_SEED_ADMIN_EMAIL || "maxseipio@gmail.com";
  const { data, error } = await admin
    .from("auth_users")
    .select("profile_id, profiles!inner(church_id)")
    .eq("email", seedEmail)
    .maybeSingle();
  if (error) throw error;
  if (data?.profile_id && data.profiles?.church_id === churchId) {
    return data.profile_id;
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id")
    .eq("church_id", churchId)
    .limit(1)
    .maybeSingle();
  if (profileErr) throw profileErr;
  if (!profile?.id) throw new Error(`No profile for church_id=${churchId}`);
  return profile.id;
}

async function clean(admin, churchId) {
  const { data, error } = await admin
    .from("church_events")
    .select("id, title")
    .eq("church_id", churchId)
    .like("title", `${MARKER}%`);
  if (error) throw error;
  if (!data?.length) {
    console.log("No test website events to remove.");
    return;
  }
  const ids = data.map((row) => row.id);
  const { error: delErr } = await admin
    .from("church_events")
    .delete()
    .in("id", ids);
  if (delErr) throw delErr;
  console.log(`Removed ${ids.length} test event(s).`);
}

async function seed(admin, churchId, profileId) {
  const now = new Date();
  let inserted = 0;

  for (const spec of TEST_EVENTS) {
    const startDate = addDays(now, spec.daysFromNow);
    const localDate = toIsoDate(startDate);
    const time = toTime(spec.hour);
    const startsAt = new Date(`${localDate}T${time}`).toISOString();

    const { error } = await admin.from("church_events").insert({
      church_id: churchId,
      title: spec.title,
      description: spec.description,
      location: spec.location,
      event_type: spec.event_type,
      ministry_id: null,
      fund_id: null,
      starts_at: startsAt,
      ends_at: null,
      is_all_day: false,
      is_featured: spec.is_featured,
      is_website_listed: spec.is_website_listed,
      is_website_promoted: spec.is_website_promoted,
      is_recurring: false,
      recurrence_rule: null,
      recurrence_until: null,
      created_by_profile_id: profileId,
    });

    if (error) {
      console.error(`Failed: ${spec.title}`, error.message);
      continue;
    }
    inserted += 1;
    console.log(`+ ${spec.title}`);
  }

  console.log(`\nInserted ${inserted}/${TEST_EVENTS.length} test events (church_id=${churchId}).`);

  const { data: publicPayload, error: pubErr } = await admin.rpc(
    "sp_get_public_website_events",
    { p_church_id: churchId },
  );
  if (pubErr) {
    console.warn("Could not verify public RPC:", pubErr.message);
    return;
  }
  const listed = publicPayload?.listed?.length ?? 0;
  const promoted = publicPayload?.promoted?.length ?? 0;
  console.log(`Public RPC: listed=${listed}, promoted=${promoted}`);
}

async function main() {
  const cleanOnly = process.argv.includes("--clean");
  const env = loadEnv();
  const { url, serviceRoleKey } = getSupabaseConfig(env);

  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  });

  const churchId = await resolveChurch(admin, env);
  console.log(`church_id=${churchId}`);

  if (cleanOnly) {
    await clean(admin, churchId);
    return;
  }

  await clean(admin, churchId);
  const profileId = await resolveProfileId(admin, churchId, env);
  await seed(admin, churchId, profileId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
