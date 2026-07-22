#!/usr/bin/env node

import {
  getQaRbacUsers,
  getSupabaseConfig,
  loadEnv,
  rpcCall,
  signIn,
} from "./lib/qa-env.mjs";

const env = loadEnv();
const config = getSupabaseConfig(env);
const users = getQaRbacUsers(env);
const results = [];
const createdSessionIds = new Set();

function record(id, title, status, detail = "") {
  results.push({ id, title, status, detail });
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "○";
  console.log(`${icon} [${id}] ${title}: ${status}${detail ? ` — ${detail}` : ""}`);
}

function requireSuccess(data, label) {
  if (!data || data.success !== true) {
    throw new Error(`${label}: ${data?.message ?? "respuesta RPC sin success=true"}`);
  }
  return data;
}

function sessionPayload({
  churchId,
  action,
  sessionId = null,
  attendanceMode,
  aggregateData = [],
}) {
  return {
    p_church_id: churchId,
    p_action: action,
    p_session_id: sessionId,
    p_session_date: action === "delete" ? null : new Date().toISOString().slice(0, 10),
    p_activity_type: action === "delete" ? null : "service",
    p_ministry_id: null,
    p_event_id: null,
    p_title: action === "delete" ? null : `QA asistencia ${Date.now()}`,
    p_notes: action === "delete" ? null : "Creada por scripts/qa-attendance.mjs",
    p_attendance_mode: action === "delete" ? null : attendanceMode,
    p_aggregate_data: action === "delete" ? [] : aggregateData,
  };
}

async function expectRpcDenied(token, fn, body) {
  try {
    const data = await rpcCall(token, fn, body, env);
    return data?.success === false;
  } catch {
    return true;
  }
}

async function restRows(token, resourceAndQuery) {
  const response = await fetch(`${config.url}/rest/v1/${resourceAndQuery}`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message ?? `PostgREST ${response.status}`);
  }
  return Array.isArray(data) ? data : [];
}

async function deleteSession(token, churchId, sessionId) {
  const data = await rpcCall(
    token,
    "sp_maintain_attendance_session",
    sessionPayload({
      churchId,
      action: "delete",
      sessionId,
      attendanceMode: "individual",
    }),
    env,
  );
  requireSuccess(data, "cleanup asistencia");
  createdSessionIds.delete(sessionId);
}

async function main() {
  if (!config.url || !config.anonKey) {
    record("ATT-ENV-01", "Configuración Supabase", "FAIL", "Faltan NEXT_PUBLIC_SUPABASE_*");
    return;
  }
  if (!users.ADMIN.email || !users.ADMIN.password) {
    record("ATT-ENV-02", "Usuario QA administrador", "FAIL", "Faltan QA_RBAC_ADMIN_*");
    return;
  }
  record("ATT-ENV-01", "Configuración Supabase", "PASS");

  const adminAuth = await signIn(users.ADMIN.email, users.ADMIN.password, env);
  const token = adminAuth.access_token;
  const context = await rpcCall(token, "sp_get_session_context", {}, env);
  if (!context || typeof context !== "object") {
    throw new Error("sp_get_session_context no retornó un objeto");
  }
  const churchId = Number(context.church_id ?? context.churchId);
  const profileId = String(context.profile_id ?? context.profileId ?? "");
  const permissions = Array.isArray(context.permissions) ? context.permissions.map(String) : [];

  if (!Number.isInteger(churchId) || churchId <= 0 || !profileId) {
    throw new Error("El usuario QA no tiene church_id/profile_id válidos");
  }
  const requiredPermissions = ["attendance:read", "attendance:write"];
  const missingPermissions = requiredPermissions.filter((key) => !permissions.includes(key));
  if (missingPermissions.length > 0) {
    record("ATT-RBAC-01", "Permisos administrador", "FAIL", `Faltan ${missingPermissions.join(", ")}`);
    return;
  }
  record("ATT-RBAC-01", "Permisos administrador", "PASS");

  const ministries = await restRows(
    token,
    `church_ministries?select=id,name,ministry_category&church_id=eq.${churchId}&is_active=eq.true`,
  );
  const activityMinistryCodes = {
    house_group: ["house_group", "cell_group"],
    bible_study: ["discipleship"],
    children: ["children"],
  };
  for (const [activityType, categoryCodes] of Object.entries(activityMinistryCodes)) {
    const ministry = ministries.find((row) => categoryCodes.includes(row.ministry_category));
    if (!ministry) {
      record(
        `ATT-${activityType.toUpperCase()}-01`,
        `Crear sesión ${activityType}`,
        "BLOCKED",
        `No hay ministerio activo en categorías ${categoryCodes.join("/")}`,
      );
      continue;
    }
    const created = requireSuccess(
      await rpcCall(token, "sp_maintain_attendance_session", {
        ...sessionPayload({
          churchId,
          action: "insert",
          attendanceMode: "individual",
        }),
        p_activity_type: activityType,
        p_ministry_id: ministry.id,
        p_title: `QA ${activityType} ${Date.now()}`,
      }, env),
      `crear sesión ${activityType}`,
    );
    const activitySessionId = String(created.sessionId ?? "");
    createdSessionIds.add(activitySessionId);
    const detail = requireSuccess(
      await rpcCall(token, "sp_get_attendance_session", {
        p_session_id: activitySessionId,
        p_church_id: churchId,
      }, env),
      `detalle ${activityType}`,
    );
    if (
      detail.session?.activityType !== activityType ||
      detail.session?.ministryId !== ministry.id
    ) {
      throw new Error(`La sesión ${activityType} no preservó su ministerio`);
    }
    record(
      `ATT-${activityType.toUpperCase()}-01`,
      `Crear sesión ${activityType}`,
      "PASS",
      ministry.name,
    );
    await deleteSession(token, churchId, activitySessionId);
  }

  const missingMinistryDenied = await expectRpcDenied(token, "sp_maintain_attendance_session", {
    ...sessionPayload({ churchId, action: "insert", attendanceMode: "individual" }),
    p_activity_type: "house_group",
    p_ministry_id: null,
  });
  record(
    "ATT-MINISTRY-01",
    "Ministerio obligatorio para casa",
    missingMinistryDenied ? "PASS" : "FAIL",
  );

  const aggregateData = [
    { label: "Adultos", value: 12 },
    { label: "Niños", value: 4 },
    { label: "Visitas", value: 2 },
  ];
  const insertAggregate = requireSuccess(
    await rpcCall(
      token,
      "sp_maintain_attendance_session",
      sessionPayload({
        churchId,
        action: "insert",
        attendanceMode: "aggregate",
        aggregateData,
      }),
      env,
    ),
    "crear sesión agregada",
  );
  const sessionId = String(insertAggregate.sessionId ?? insertAggregate.session_id ?? "");
  if (!sessionId) throw new Error("La creación agregada no retornó sessionId");
  createdSessionIds.add(sessionId);
  record("ATT-AGG-01", "Crear sesión agregada", "PASS", sessionId);

  const detailAggregate = requireSuccess(
    await rpcCall(token, "sp_get_attendance_session", {
      p_session_id: sessionId,
      p_church_id: churchId,
    }, env),
    "detalle agregado",
  );
  const storedAggregate = detailAggregate.session?.aggregateData ?? detailAggregate.session?.aggregate_data;
  if (detailAggregate.session?.attendanceMode !== "aggregate" || !Array.isArray(storedAggregate) || storedAggregate.length !== 3) {
    throw new Error("El detalle no preservó modo/conceptos agregados");
  }
  if (Array.isArray(detailAggregate.records) && detailAggregate.records.length !== 0) {
    throw new Error("Una sesión agregada expuso registros individuales");
  }
  record("ATT-AGG-02", "Detalle agregado y conceptos dinámicos", "PASS");

  const listed = requireSuccess(
    await rpcCall(token, "sp_list_attendance_sessions", {
      p_church_id: churchId,
      p_activity_type: "service",
      p_ministry_id: null,
      p_from: null,
      p_to: null,
      p_limit: 200,
      p_offset: 0,
    }, env),
    "listado asistencia",
  );
  const listedSession = listed.sessions?.find((row) => row.id === sessionId);
  if (!listedSession || listedSession.attendanceMode !== "aggregate" || listedSession.presentCount !== 18 || listedSession.recordCount !== 18) {
    throw new Error("El listado no calculó el total agregado esperado (18)");
  }
  record("ATT-AGG-03", "Total agregado en listado", "PASS", "18 asistentes");

  const emptyAggregate = await rpcCall(
    token,
    "sp_maintain_attendance_session",
    sessionPayload({ churchId, action: "insert", attendanceMode: "aggregate", aggregateData: [] }),
    env,
  );
  if (emptyAggregate?.success !== false || Number(emptyAggregate.status_code) !== 400) {
    throw new Error("Se aceptó una sesión agregada sin conceptos");
  }
  record("ATT-AGG-04", "Rechazar agregado vacío", "PASS");

  const aggregateRecordDenied = await expectRpcDenied(token, "sp_set_attendance_records", {
    p_church_id: churchId,
    p_session_id: sessionId,
    p_records: [{ profileId, status: "present", notes: "" }],
  });
  record(
    "ATT-AGG-05",
    "Bloquear records en modo agregado",
    aggregateRecordDenied ? "PASS" : "FAIL",
  );

  requireSuccess(
    await rpcCall(
      token,
      "sp_maintain_attendance_session",
      sessionPayload({
        churchId,
        action: "update",
        sessionId,
        attendanceMode: "individual",
      }),
      env,
    ),
    "cambiar agregado a individual",
  );
  const individualWrite = requireSuccess(
    await rpcCall(token, "sp_set_attendance_records", {
      p_church_id: churchId,
      p_session_id: sessionId,
      p_records: [{ profileId, status: "late", notes: "QA" }],
    }, env),
    "guardar record individual",
  );
  if (Number(individualWrite.count) !== 1) throw new Error("No se guardó el record individual");
  const detailIndividual = requireSuccess(
    await rpcCall(token, "sp_get_attendance_session", {
      p_session_id: sessionId,
      p_church_id: churchId,
    }, env),
    "detalle individual",
  );
  if (detailIndividual.session?.attendanceMode !== "individual" || detailIndividual.session?.aggregateData?.length !== 0 || detailIndividual.records?.[0]?.status !== "late") {
    throw new Error("La conversión a individual no limpió/persistió los datos esperados");
  }
  record("ATT-MODE-01", "Agregado → individual", "PASS");

  requireSuccess(
    await rpcCall(
      token,
      "sp_maintain_attendance_session",
      sessionPayload({
        churchId,
        action: "update",
        sessionId,
        attendanceMode: "aggregate",
        aggregateData: [{ label: "Total", value: 9 }],
      }),
      env,
    ),
    "cambiar individual a agregado",
  );
  const detailConverted = requireSuccess(
    await rpcCall(token, "sp_get_attendance_session", {
      p_session_id: sessionId,
      p_church_id: churchId,
    }, env),
    "detalle convertido",
  );
  if (detailConverted.records?.length !== 0 || detailConverted.session?.aggregateData?.[0]?.value !== 9) {
    throw new Error("Individual → agregado no eliminó records o no guardó el total");
  }
  record("ATT-MODE-02", "Individual → agregado elimina records", "PASS");

  const crossTenantDenied = await expectRpcDenied(token, "sp_list_attendance_sessions", {
    p_church_id: churchId + 1000000,
    p_activity_type: null,
    p_ministry_id: null,
    p_from: null,
    p_to: null,
    p_limit: 1,
    p_offset: 0,
  });
  record("ATT-SEC-01", "Bloqueo cross-tenant", crossTenantDenied ? "PASS" : "FAIL");

  if (users.NOROLE.email && users.NOROLE.password) {
    const noRoleAuth = await signIn(users.NOROLE.email, users.NOROLE.password, env);
    const denied = await expectRpcDenied(noRoleAuth.access_token, "sp_list_attendance_sessions", {
      p_church_id: churchId,
      p_activity_type: null,
      p_ministry_id: null,
      p_from: null,
      p_to: null,
      p_limit: 1,
      p_offset: 0,
    });
    record("ATT-RBAC-02", "Usuario sin permiso no lista asistencia", denied ? "PASS" : "FAIL");
  } else {
    record("ATT-RBAC-02", "Usuario sin permiso no lista asistencia", "BLOCKED", "Credenciales NOROLE ausentes");
  }

  await deleteSession(token, churchId, sessionId);
  record("ATT-CLEAN-01", "Limpieza de sesión QA", "PASS");
}

let fatal = null;
try {
  await main();
} catch (error) {
  fatal = error;
  record("ATT-FATAL", "Ejecución suite", "FAIL", error instanceof Error ? error.message : String(error));
} finally {
  if (createdSessionIds.size > 0 && users.ADMIN.email && users.ADMIN.password) {
    try {
      const auth = await signIn(users.ADMIN.email, users.ADMIN.password, env);
      const context = await rpcCall(auth.access_token, "sp_get_session_context", {}, env);
      const churchId = Number(context.church_id ?? context.churchId);
      for (const sessionId of [...createdSessionIds]) {
        await deleteSession(auth.access_token, churchId, sessionId);
      }
      console.log("✓ Limpieza de contingencia completada");
    } catch (cleanupError) {
      console.error(`✗ Limpieza de contingencia falló: ${cleanupError instanceof Error ? cleanupError.message : cleanupError}`);
    }
  }
}

const failed = results.filter((result) => result.status === "FAIL");
const blocked = results.filter((result) => result.status === "BLOCKED");
console.log(`\nResumen: ${results.length - failed.length - blocked.length} PASS, ${failed.length} FAIL, ${blocked.length} BLOCKED`);
if (fatal || failed.length > 0 || blocked.length > 0) process.exitCode = 1;
