# Decision Log — EvoChurch

Registro de decisiones arquitectónicas (ADR). Formato basado en [ADR_TEMPLATE.md](../templates/ADR_TEMPLATE.md).

---

## ADR-001 — Sesión de negocio desde PostgreSQL, no JWT

**Fecha:** 2026-06-29  
**Estado:** Aceptado  
**Migración:** `20260629120000_session_context.sql`

### Contexto

El cliente (web/Flutter) tenía `church_id` en `user_metadata` / `app_metadata` del JWT. Esto permitía desincronización y no reflejaba permisos reales de BD.

### Decisión

`sp_get_session_context()` resuelve `church_id`, `profile_id`, roles y permisos desde `auth.uid()` en PostgreSQL. Next.js usa `getAppSession()`; Flutter debe alinearse vía repositorio.

### Consecuencias

- `src/lib/tenant.ts` marcado `@deprecated` para autorización.
- `app_metadata` es solo caché de lectura (sync vía triggers/RPC).
- Toda Server Action usa `getActionSession()`.

---

## ADR-002 — RPC como capa de negocio compartida

**Fecha:** 2026-06 (evolución continua)  
**Estado:** Aceptado

### Contexto

Dos clientes (Next.js + Flutter) sobre misma BD. Lógica duplicada en cliente genera inconsistencias y riesgos multitenant.

### Decisión

Operaciones de negocio vía stored procedures (`sp_*`, `fn_*`) con guards de tenant. Servicios web en `src/lib/services/` solo encapsulan RPC + parseo.

### Consecuencias

- Migraciones SQL son parte del contrato API.
- Cambio de RPC requiere actualizar web y Flutter.
- PostgREST directo solo para casos simples con RLS (ej. `church_ministries`).

---

## ADR-003 — RBAC granular con permission keys

**Fecha:** 2026-07-02  
**Estado:** Aceptado  
**Migración:** `20260702120000_rbac_permissions_foundation.sql`

### Contexto

Roles monolíticos ("admin", "tesorero") no escalaban para permisos finos (exportar reportes, autorizar transacciones, catálogos).

### Decisión

Permisos atómicos (`members:read`, `finances:transactions:authorize`, …) en `app_permissions`. Roles sistema + roles custom por iglesia. Fuente en BD, expuestos en sesión.

### Consecuencias

- `src/lib/auth/permission-keys.ts` debe sincronizarse con seed BD.
- `getActionSessionWith(permission)` en mutaciones.
- Componente `<Can permission={…}>` en UI.

---

## ADR-004 — Guards de tenant en RPC, RLS como segunda línea

**Fecha:** 2026-07-01  
**Estado:** Aceptado  
**Migración:** `20260701120000_tenant_profile_assert_and_rpc_guards.sql`

### Contexto

RLS solo no cubre lógica compleja en `SECURITY DEFINER`. Cliente podía enviar `p_church_id` incorrecto.

### Decisión

Todo RPC con `p_church_id` llama `fn_assert_session_church`. Perfiles: `fn_assert_profile_in_session_church`. RLS complementa en tablas PostgREST.

### Consecuencias

- Checklist multitenant obligatorio en reviews.
- Tests manuales cross-tenant en cada feature nueva.

---

## ADR-005 — Flutter: migración incremental a Riverpod

**Fecha:** 2026-05 (en curso)  
**Estado:** Aceptado

### Contexto

Codebase Flutter con MVVM + Provider legacy coexistiendo con features Riverpod.

### Decisión

Features nuevos: `data → domain → providers → presentation` con `HookConsumerWidget`. No revertir módulos migrados (auth, members, finances). Sin Freezed ni code generation.

### Consecuencias

- `lib/src/view/` y `view_model/` son legacy — no agregar código.
- `authProvider.churchId` es fuente para RPC en features migrados.
- Documentado en `uploads/CONTEXT.md`.

---

## ADR-006 — Un motor de asistencia

**Fecha:** 2026-07 (producto)  
**Estado:** Aceptado e implementado — QA staging 2026-07-21

### Contexto

Riesgo de crear módulos separados de asistencia por culto, casas fuente, escuela bíblica, niños.

### Decisión

Un `attendance_engine` genérico configurable por tipo de actividad. Módulos específicos son configuraciones, no código duplicado. Cada sesión admite modo `individual` (roster y estados) o `aggregate` (conceptos y cantidades dinámicas) dentro de las mismas tablas y RPC.

### Consecuencias

- `attendance_session` + `attendance_record` son el único motor para casas, estudios, niños y cultos.
- Las categorías y ministerios configuran el comportamiento; no se crean módulos paralelos.
- El modo agregado conserva el aislamiento tenant y rechaza registros individuales.

---

## ADR-007 — White-label por iglesia

**Fecha:** 2026-07-07  
**Estado:** Aceptado  
**Migración:** `church_profile_phase1`, `church_network_phase2`

### Contexto

Iglesias requieren identidad visual propia (logo, colores) sin fork de código.

### Decisión

`churchBranding` en sesión (`primaryColor`, `secondaryColor`, `accentColor`, `logoUrl`). CSS vars inyectadas vía `ChurchBrandProvider`. Defaults producto en `church-defaults.ts`.

### Consecuencias

- No hardcodear `#5B21B6` en componentes nuevos.
- Logo en Supabase Storage con signed URLs.

---

## ADR-008 — Server Actions para mutaciones web

**Fecha:** 2026 (Next.js app)  
**Estado:** Aceptado

### Contexto

API routes vs Server Actions para formularios y mutaciones en App Router.

### Decisión

Mutaciones en `actions.ts` por módulo con `"use server"`. Retorno `{ ok, errorKey }` para i18n. Lectura en Server Components.

### Consecuencias

- Patrón documentado en [AI_BACKEND_GUIDE.md](../engineering/AI_BACKEND_GUIDE.md).
- `revalidatePath` tras mutaciones.

---

## Cómo agregar un ADR

1. Copiar [ADR_TEMPLATE.md](../templates/ADR_TEMPLATE.md).
2. Numerar secuencialmente (`ADR-009`).
3. Estados: Propuesto → Aceptado | Deprecado.
4. Enlazar migraciones y archivos de código.
5. PR de código que implementa la decisión debe referenciar el ADR.

---

## Documentos relacionados

- [../templates/ADR_TEMPLATE.md](../templates/ADR_TEMPLATE.md)
- [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)
- [MULTI_TENANT.md](MULTI_TENANT.md)
