# Agent prompt — Audit log / bitácora de acciones por iglesia

Copia el bloque **Prompt para agente** al iniciar una sesión, o referencia con `@mejoras/AGENT-PROMPT-AUDIT-LOG.md`.

**Rama sugerida:** `feat/audit-log`  
**Alcance:** un sprint — BD + instrumentación RPC + dashboard + reporte visual en `/reports`  
**Principios:** **multitenant estricto**, **append-only**, **BD como fuente de verdad**, **KISS**

---

## Prompt para agente

```
Eres ingeniero senior Next.js 16 + Postgres/Supabase multitenant en evochurch-web.

Implementa el módulo de audit log (bitácora de acciones por iglesia) según @mejoras/AGENT-PROMPT-AUDIT-LOG.md.

Reglas:
- Lee AGENTS.md y uploads/CONTEXT.md antes de codear.
- Tenant: church_id solo desde getAppSession() / getActionSession() → sp_get_session_context().
- Nunca confiar en metadata del cliente para autorizar lectura del log.
- Migraciones: supabase migration new <nombre> antes de escribir SQL.
- Escritura del log: SOLO desde Postgres (fn_append_church_audit_log / RPCs existentes). No INSERT directo desde el browser.
- Lectura: RPC con fn_assert_session_church + permiso audit:read.
- UI refleja permisos; server actions y RPC igual rechazan sin permiso.
- Reemplazar mock del dashboard (dashboardMock.activities) por datos reales.
- Integrar reporte interactivo en hub /reports (nuevo ReportId) + export PDF/XLSX.
- i18n es/en/fr para strings nuevas.
- Diff mínimo; no refactorizar módulos no relacionados.
- No commits salvo que el usuario lo pida.
- Al terminar: npm run build (y lint en archivos tocados).

Orden de trabajo: § Tareas del sprint (AUDIT-1 → AUDIT-7).
Marca DoD de cada tarea antes de pasar a la siguiente.
```

---

## Contexto obligatorio (leer antes de codear)

| Archivo | Por qué |
|---------|---------|
| `AGENTS.md` | Multitenant, `sp_get_session_context`, convenciones |
| `uploads/CONTEXT.md` | RPCs, módulos, riesgos members |
| `src/lib/auth/app-session.ts` | Sesión (`churchId`, `profileId`, `permissions[]`) |
| `src/lib/auth/permission-keys.ts` | Catálogo tipado de permisos |
| `src/lib/auth/permissions-server.ts` | `getActionSessionWith(perm)` en server actions |
| `src/lib/reports/catalog.ts` | Patrón hub de reportes |
| `src/lib/reports/permissions.ts` | Permisos granulares `reports:{resource}:{read\|export}` |
| `src/lib/reports/types.ts` | `ReportId`, generadores PDF/XLSX |
| `src/lib/services/dashboard.ts` | `sp_get_dashboard_summary` — extender o RPC aparte |
| `src/components/dashboard/dashboard-view.tsx` | Placeholder actividad reciente + toast "próximamente" |
| `src/components/dashboard/activity-feed.tsx` | UI timeline (hoy usa mock) |
| `src/lib/mock/dashboard-data.ts` | Tipo `Activity` ficticio a reemplazar |
| `supabase/migrations/20260702120000_rbac_permissions_foundation.sql` | Patrón `app_permissions` + seeds |
| `supabase/migrations/20260701235300_dashboard_summary_rpc.sql` | RPC dashboard existente |

### Estado actual (no reimplementar)

- Dashboard tiene tarjeta **"Actividad reciente"** con `ActivityFeed` alimentado por **`dashboardMock.activities`**.
- Botón **"Ver todo"** muestra toast `activityLogSoon` — no navega a ningún lado.
- **No existe** tabla `church_audit_log` ni permiso `audit:*` en BD.
- Hub `/reports` ya tiene infraestructura de catálogo, preview y export — reutilizar.

---

## Decisiones de producto (cerradas)

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | ¿Qué es el log? | **Auditoría de acciones administrativas** (quién hizo qué, cuándo, sobre qué entidad). No reemplaza reportes financieros ni KPIs. |
| 2 | ¿Scope tenant? | **Por iglesia** (`church_id`). RLS estricto. Usuario solo ve log de su iglesia. |
| 3 | ¿Mutabilidad? | **Append-only** para roles app. Sin UPDATE/DELETE para authenticated. Retención: sin purge en v1 (futuro: job archivado). |
| 4 | ¿Quién puede leer? | **`audit:read`** — default: Admin, Pastor. Tesorero/Secretario/Líder: **no** en v1 salvo override por iglesia. |
| 5 | ¿Quién puede exportar? | **`audit:export`** — mismo default que read; requerido para PDF/XLSX del reporte. |
| 6 | ¿Dónde va el resumen? | **Dashboard** — últimas **15** entradas en tarjeta existente. |
| 7 | ¿Dónde va el reporte completo? | **`/reports`** — nuevo reporte `audit-activity-log`, categoría **executive**, vista interactiva + export. |
| 8 | ¿Dónde se escribe el log? | **Postgres** dentro de RPCs de mutación (preferido). Evitar solo server actions Next.js (Flutter compartiría BD). |
| 9 | ¿Login/logout? | **Opcional v1** — incluir si es trivial (`auth.login`, `auth.logout`); no blocker. |
| 10 | ¿PII en metadata? | Guardar **snapshot** de nombre actor en fila; metadata jsonb sin contraseñas ni tokens. |

---

## Arquitectura

```
Mutación (RPC sp_*)
    │
    ▼
fn_append_church_audit_log(...)
    │
    ▼
church_audit_log (append-only, RLS)
    │
    ├── sp_list_church_audit_log (paginado + filtros) ──► /reports (vista + export)
    │
    └── sp_get_dashboard_summary.recent_audit[] (top 15) ──► Dashboard ActivityFeed
```

**Regla de oro:** si el usuario no tiene `audit:read`, no ve feed ni reporte; RPC retorna error o array vacío según patrón existente.

---

## Esquema BD (AUDIT-1)

Migración `supabase migration new church_audit_log_module`.

### Tabla `public.church_audit_log`

```sql
CREATE TABLE public.church_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id integer NOT NULL REFERENCES public.church(id) ON DELETE CASCADE,
  actor_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_display_name text NOT NULL DEFAULT '',
  module text NOT NULL,           -- members | finances | eventos | settings | admin_users | roles | auth
  action text NOT NULL,           -- create | update | delete | authorize | reject | login | logout
  entity_type text,               -- profile | transaction | fund | event | auth_user | role | ...
  entity_id text,                 -- uuid o id serializado
  summary text NOT NULL,          -- human-readable, locale-agnostic key o texto ES base
  summary_key text,               -- opcional i18n key ej. audit.actions.members.create
  summary_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Índices:
- `(church_id, created_at DESC)`
- `(church_id, module, created_at DESC)`
- `(church_id, actor_profile_id, created_at DESC)` WHERE actor_profile_id IS NOT NULL

RLS:
- `ENABLE ROW LEVEL SECURITY` + `FORCE`
- SELECT: `church_id = fn_get_session_church_id()` AND `fn_user_has_permission('audit:read')`
- INSERT: **denegado** para `authenticated` directo — solo `SECURITY DEFINER` en helper

### Helper interno

```sql
CREATE OR REPLACE FUNCTION public.fn_append_church_audit_log(
  p_church_id integer,
  p_module text,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_summary text,
  p_summary_key text DEFAULT NULL,
  p_summary_params jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
-- SECURITY DEFINER; resuelve actor desde auth.uid() + profiles; fn_assert_session_church
```

### RPC lectura

```sql
CREATE OR REPLACE FUNCTION public.sp_list_church_audit_log(
  p_church_id integer,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_module text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_actor_profile_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
) RETURNS json
-- fn_assert_session_church + fn_assert_permission('audit:read')
-- Retorna { items: [...], total: N }
```

Opcional: extender `sp_get_dashboard_summary` con `recent_audit json` (top 15) para un solo round-trip — **preferido** si el RPC ya agrega bloques similares.

---

## Permisos RBAC (AUDIT-2)

Insertar en `app_permissions`:

| permission_key | module | action | description |
|----------------|--------|--------|-------------|
| `audit:read` | audit | read | Ver bitácora de acciones |
| `audit:export` | audit | export | Exportar bitácora |

Defaults en `app_role_permissions`:
- **Admin (1):** read + export
- **Pastor (4):** read + export
- **Secretario, Tesorero, Líder:** ninguno (v1)

Reporte en hub — añadir a `REPORT_RESOURCE_DEFS` / catálogo:

| resource key | reportId | permisos |
|--------------|----------|----------|
| `audit_activity_log` | `audit-activity-log` | `reports:audit_activity_log:read`, `reports:audit_activity_log:export` |

**Alternativa KISS v1:** usar solo `audit:read` / `audit:export` sin permisos reports:* duplicados — elegir **una** vía y documentar en código. Recomendación: **`audit:read` + `audit:export`** directos (menos permisos nuevos en matriz reports).

Actualizar:
- `src/lib/auth/permission-keys.ts`
- `src/lib/auth/route-permissions.ts` (si ruta dedicada)
- `src/lib/roles/display.ts` (matriz UI)
- Seeds SQL + bridge permisos pastor/admin

---

## Acciones a instrumentar en v1 (AUDIT-3)

Mínimo **8 RPCs** (añadir `PERFORM fn_append_church_audit_log(...)` al final, antes del RETURN):

| Módulo | RPC / trigger | action | entity_type |
|--------|---------------|--------|-------------|
| Finanzas | `sp_authorize_transaction` | authorize | transaction |
| Finanzas | `sp_authorize_fund_transfer` | authorize | fund_transfer |
| Finanzas | guardar egreso/ingreso (ledger RPC usado por actions) | create / update | transaction |
| Miembros | RPC create/update/delete profile (buscar en migrations members) | create / update / delete | profile |
| Eventos | `sp_save_event` / `sp_delete_event` | create / update / delete | event |
| Admin users | `sp_register_church_auth_user` / update church auth user | create / update | auth_user |
| Roles | `sp_create_church_role` / update / delete | create / update / delete | role |
| Catálogos | income/expense type save/delete RPCs | create / update / delete | catalog_item |

`summary` en español base + `summary_key` para i18n en UI:

```json
{ "summary_key": "audit.actions.finances.authorize", "summary_params": { "amount": "RD$500", "id": "…" } }
```

No bloquear la mutación si falla el log — `EXCEPTION WHEN OTHERS` log warning o nested block; **preferido:** log en misma transacción (falla todo si log falla — más auditable).

---

## Capa Next.js (AUDIT-4)

### Tipos y parse

- `src/lib/audit/types.ts` — `AuditLogEntry`, filtros, respuesta paginada
- `src/lib/audit/parse.ts` — parse RPC JSON
- `src/lib/audit/labels.ts` — resolver `summary_key` + params con i18n

### Servicio

- `src/lib/services/audit-log.ts`
  - `fetchRecentAuditLog(supabase, churchId, limit?)` — dashboard
  - `fetchAuditLogPage(supabase, churchId, filters)` — reporte

### Dashboard

Archivos:
- `src/lib/dashboard/types.ts` — añadir `recentAudit: AuditLogEntry[]` a `DashboardPayload`
- `src/lib/dashboard/parse.ts` — parsear bloque `recent_audit`
- `src/components/dashboard/activity-feed.tsx` — aceptar tipo real (no mock)
- `src/components/dashboard/dashboard-view.tsx`:
  - Pasar `recentAudit` desde props
  - **"Ver todo"** → `router.push('/reports?report=audit-activity-log')` (no toast)
  - Eliminar dependencia de `dashboardMock.activities`

### Reporte visual (AUDIT-5)

1. Añadir `audit-activity-log` a `REPORT_IDS` en `src/lib/reports/types.ts`
2. Entrada en `REPORT_CATALOG` — categoría `executive`, `periodKind: "none"`, formats pdf + xlsx
3. Componente **`AuditLogReportView`** (nuevo):
   - Timeline / tabla con paginación
   - Filtros: rango fechas, módulo, acción, actor (combobox miembros admin si existe patrón)
   - KPIs mini: acciones hoy, esta semana, top módulo (query agregada o calc client-side primera página)
4. Integrar en `ReportsHubView` — preview interactivo (como reportes con payload, no solo PDF)
5. Generador export:
   - `src/lib/reports/generators/audit-activity-log.ts`
   - PDF: tabla paginada; XLSX: columnas fecha, actor, módulo, acción, resumen, entity_id

Permisos página: `requirePageAccess('/reports')` + `audit:read` al abrir reporte audit.

---

## i18n (AUDIT-6)

Namespaces en `es.json`, `en.json`, `fr.json`:

```json
"audit": {
  "title": "Bitácora de acciones",
  "subtitle": "Registro de actividad administrativa de la iglesia",
  "modules": { "members": "Miembros", "finances": "Finanzas", ... },
  "actions": { "create": "Creó", "update": "Editó", "authorize": "Autorizó", ... },
  "filters": { "from": "Desde", "to": "Hasta", "module": "Módulo", "actor": "Usuario" },
  "empty": "No hay acciones registradas en este período.",
  "exportFilename": "bitacora-acciones"
}
```

Dashboard: reutilizar keys existentes `dashboard.recentActivity`, quitar o dejar de usar `activityLogSoon`.

---

## Tareas del sprint (orden estricto)

### AUDIT-1 — Migración BD
- [ ] Tabla + índices + RLS
- [ ] `fn_append_church_audit_log`
- [ ] `sp_list_church_audit_log`
- [ ] Extender `sp_get_dashboard_summary` con `recent_audit` (top 15) **o** RPC dedicado ligero
- [ ] GRANT EXECUTE authenticated

**DoD:** SQL aplica sin error; INSERT directo desde cliente bloqueado; SELECT exige permiso.

### AUDIT-2 — Permisos
- [ ] Seeds `audit:read`, `audit:export`
- [ ] Defaults admin + pastor
- [ ] Tipos TS + matriz roles UI

**DoD:** `sp_get_session_context` incluye permisos; pastor/admin ven reporte; tesorero no.

### AUDIT-3 — Instrumentación RPC
- [ ] ≥ 8 mutaciones críticas escriben log
- [ ] summary_key consistente

**DoD:** Crear miembro → fila en log; autorizar egreso → fila; delete evento → fila.

### AUDIT-4 — Dashboard feed real
- [ ] Payload dashboard incluye recent audit
- [ ] ActivityFeed con datos reales + tiempos relativos i18n
- [ ] Link "Ver todo" → reports

**DoD:** Dashboard sin mock activities; feed muestra acciones reales post-mutación.

### AUDIT-5 — Reporte `/reports`
- [ ] Catálogo + permisos
- [ ] Vista interactiva con filtros y paginación
- [ ] Export PDF + XLSX

**DoD:** Filtrar por módulo finanzas muestra solo finanzas; export descarga archivo válido.

### AUDIT-6 — i18n
- [ ] es/en/fr completos
- [ ] summary_key resueltos en UI

**DoD:** Cambiar locale traduce módulos/acciones del log.

### AUDIT-7 — QA manual
- [ ] `npm run build` exit 0
- [ ] Matriz permisos: admin ✓, tesorero ✗
- [ ] Multitenant: usuario iglesia A no ve log iglesia B (RLS)
- [ ] Paginación reporte > 50 filas
- [ ] Dashboard top 15 coherente con reporte

---

## Archivos esperados (referencia)

```
supabase/migrations/YYYYMMDDHHMMSS_church_audit_log_module.sql

src/lib/audit/types.ts
src/lib/audit/parse.ts
src/lib/audit/labels.ts
src/lib/services/audit-log.ts

src/lib/dashboard/types.ts                    (mod)
src/lib/dashboard/parse.ts                    (mod)
src/lib/services/dashboard.ts                 (mod si aplica)

src/components/dashboard/activity-feed.tsx    (mod)
src/components/dashboard/dashboard-view.tsx   (mod)
src/components/reports/audit-log-report-view.tsx (new)

src/lib/reports/types.ts                      (mod)
src/lib/reports/catalog.ts                    (mod)
src/lib/reports/generators/audit-activity-log.ts (new)
src/components/reports/reports-hub-view.tsx   (mod)

src/lib/auth/permission-keys.ts             (mod)
src/lib/roles/display.ts                      (mod)
src/i18n/messages/{es,en,fr}.json             (mod)
```

---

## Fuera de alcance (v1)

- Retención/archivado automático de logs viejos
- Log de lecturas (solo mutaciones + auth opcional)
- Configuración por iglesia del timeout o módulos logueados
- Flutter app — solo compartir BD; instrumentación mobile en sprint futuro
- Webhooks / SIEM externo
- Diff before/after completo en UI (metadata jsonb sí; UI diff en v2)

---

## QA rápido (checklist manual)

1. Login como **admin** → dashboard muestra actividad (puede estar vacío al inicio).
2. Crear contribución o autorizar egreso → aparece en feed ≤ 15 s (refresh).
3. Clic **Ver todo** → `/reports?report=audit-activity-log`.
4. Filtrar módulo **finanzas** → solo entradas finanzas.
5. Export PDF y XLSX → archivos abren correctamente.
6. Login **tesorero** → no ve reporte audit / feed oculto o vacío según diseño permisos.
7. SQL: intento SELECT cross-church → 0 filas (RLS).

---

## Notas de implementación

- Seguir estilo RPC existente: `fn_assert_session_church`, `fn_assert_permission` (post-RBAC sprint).
- Tiempos relativos en dashboard: usar `Intl.RelativeTimeFormat` con locale de sesión (patrón dashboard existente).
- No usar `dashboardMock` para actividad tras AUDIT-4.
- Si `display.ts` tiene error TS duplicado preexistente, corregir solo si bloquea build.
- Session idle guard (`SessionIdleGuard`) no relacionado — no tocar salvo conflicto de rutas.
