# Análisis + Prompt — P2 Motor de asistencia (Attendance Engine)

**Backlog:** [`BACKLOG-POST-REUNION-JUL2026.md`](./BACKLOG-POST-REUNION-JUL2026.md) — **P2**  
**EDK:** EPIC 03 · ADR-006 · [`PRODUCT_STRATEGY.md`](../.evo/product/PRODUCT_STRATEGY.md) · [`PRODUCT_ROADMAP.md`](../.evo/product/PRODUCT_ROADMAP.md) Fase 3  
**Rama:** `feat/attendance-engine`  
**Estado análisis (Modo A):** ✅ **Aprobado** (2026-07-13) — listo para Modo B

**Uso de este documento**

| Modo | Cuándo | Prompt corto |
|------|--------|--------------|
| **A — Análisis** | Evaluar alcance, priorizar tipo de actividad, cerrar decisiones | Ver [Prompt análisis](#prompt-corto--análisis-modo-a) |
| **B — Ejecución** | Tras análisis aprobado, implementar SQL + web MVP | Ver [Prompt ejecución](#prompt-corto--ejecución-modo-b) |

Leer primero siempre: **`.evo/engineering/AI_ENGINEERING_GUIDE.md`**.

---

# Parte A — Análisis de producto (evaluar antes de codear)

## 1. Qué buscamos

No es “una pantalla de checklist”. Es un **motor único** que responde:

> ¿Quién estuvo presente en qué actividad, qué día, en esta iglesia?

Necesidades operativas reales (reunión / roadmap):

| Uso | Ejemplo |
|-----|---------|
| Casas fuente | Líder marca presentes en la casa |
| Estudios bíblicos (Mar/Jue) | Check-in de la sesión |
| Ministerio de niños | Lista del día (P3, sobre este motor) |
| Cultos / servicio | Asistencia general (más adelante) |

**Principio (cerrado):** un solo motor — **no** cuatro módulos duplicados (culto, casa, niños, escuela).  
**Casa / estudio / escuela dominical** = filas de **`church_ministries`** (grupo con roster).  
**`activity_type`** clasifica la **sesión** (qué clase de lista se pasa), no crea entidades nuevas.  
Ref: ADR-006, `AI_BUSINESS_RULES.md` § Motor de asistencia.

## 2. Qué nos ofrece

### Valor inmediato (P2 — consola web)

- Crear **sesión** (fecha + tipo + iglesia + **ministerio** [+ evento opcional]).
- Marcar **registros** del **roster del ministerio**: presente / ausente / tarde.
- Historial por sesión y base para historial por persona.
- RPCs estables que Flutter reutilizará en **P4** sin reescribir backend.

### Valor en cadena (lo que desbloquea)

| Después | Depende de P2 |
|---------|----------------|
| **P2.x** Categorías de ministerios | Filtros Discipulado / Casas / Niños en picker y listados |
| **P3** Asistencia niños | Checklist de `is_child = true` |
| **P4** Asistencia móvil | Mismas RPCs en Flutter (casas / estudios en campo) |
| Dashboard / KPIs | Tendencias, inactivos, riesgos pastorales |
| Reportes / IA (futuro) | Datos limpios de participación |

### Qué no es P2

- Check-in QR / auto-registro del miembro
- Portal completo del líder
- Analytics avanzado
- Flutter (P4)
- Checklist solo-niños (P3)
- Módulo “Discipulado / Estudios” aparte (ver P2.x categorías)
- Multi-moneda (P5)

Relación con calendario: los eventos eclesiásticos (`/eventos`) serán **fuente opcional de sesiones** a futuro (`EVENTS.md`). El MVP puede crear sesiones **sueltas** sin exigir `event_id`.

## 3. Qué tan importante es

| Criterio | Evaluación |
|----------|------------|
| Prioridad EDK | 🔴 máxima en Fase 3 roadmap (“prerrequisito de todo lo demás” en asistencia) |
| Impacto pastoral | Alto — operación semanal de líderes, no solo admin de oficina |
| Diferenciador | Alto vs Excel / WhatsApp / papel |
| Dependencias | Bloquea P3 y P4 |
| Complejidad | Alta — schema mal diseñado = reescritura cara |
| Alternativa temporal | Listas externas: funciona hoy, no conecta perfiles / familia / niños / reportes |

**Posición en backlog actual**

```
Hecho: finanzas · miembros · pastorales · niños · familia · reporte familias
Siguiente estructural: P2 asistencia  ← este documento
Luego: P2.x categorías ministerios · P3 niños asistencia · P4 Flutter
Opcional: P1.3 household
Al final: P5 multi-moneda
```

## 4. Modelo mental (aprobado)

```
church_ministries                    -- ya existe: Casa Norte, Estudios martes, Escuela dominical…
  (grupo + líderes + miembros)

attendance_session
  church_id
  session_date
  activity_type   -- house_group | bible_study | children | service
  ministry_id     -- requerido para house_group / bible_study / children;
                  -- nullable solo si activity_type = service
  event_id?       -- opcional (vínculo futuro a /eventos)
  title? / notes?
  created_by_profile_id?

attendance_record
  session_id
  profile_id      -- del roster del ministerio (P2)
  status          -- present | absent | late
  church_id       -- denormalizado para RLS / queries
  notes?
```

**Reglas:**

- Una sesión → muchos registros. No inventar “asistencia de casa” ni “módulo estudios” como entidad aparte.
- El checklist P2 = **miembros del `ministry_id`**, no todos los adultos de la iglesia.
- UI hub **Asistencia** con presets “Sesión de casa” / “Sesión de estudio” (prefill `activity_type`).

### Ministerio vs tipo vs categoría (producto)

| Concepto | Qué es | Cuándo |
|----------|--------|--------|
| Ministerio | Grupo concreto (roster) | Ya existe — P2 lo usa |
| `activity_type` | Clase de la sesión | P2 (enum/CHECK) |
| Categoría de ministerio (Discipulado, Casas, Niños…) | Taxonomía para filtrar | **P2.x** — decidido, no en este sprint |

Discipulado (estudios martes, jueves de enseñanza, escuela dominical) = ministerios que en P2.x vivirán bajo categoría; **no** un segundo CRUD.

## 5. Preguntas de evaluación — **respuesta aprobada (2026-07-13)**

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | Primer `activity_type` del MVP UI | **`house_group` + `bible_study`** (presets en hub). `service` en enum/select OK. `children` en enum **sin** checklist UI. |
| 2 | Quién marca | **Staff en consola web (P2).** Líderes en campo → **P4**. Sin portal líder en P2. |
| 3 | Status MVP | **`present` \| `absent` \| `late`**. Fuera: justificado, invitado. |
| 4 | Sesión suelta vs `event_id` | **Sesiones sueltas.** `event_id` nullable; sin UI de vínculo obligatorio a `/eventos`. |
| 5 | Universo del checklist | **P2:** roster del `ministry_id`. **`children` checklist → P3.** No “todos los adultos de la iglesia”. |
| 6 | Permisos | **`attendance:read` + `attendance:write`**. Seed en roles admin/operador. No reutilizar `members:*` / `eventos:*`. `write_own` → P4. |
| 7 | Ruta / nav | **`/attendance`** top-level (label i18n Asistencia). No anidar bajo Eventos ni Ministerios. |
| — | Go / No-Go | **Go** a ejecución (Modo B). |
| — | Notas / riesgos | Schema sesión+registro desde día 1; audit; Flutter fuera; categorías ministerios = P2.x; sin módulo Discipulado duplicado. |

## 6. Criterios Go / No-Go

**Go a ejecución (modo B)** si:

- Hay al menos un `activity_type` priorizado para UI.
- Se acepta schema sesión + registro (ADR-006).
- Queda claro: P2 = web; Flutter = P4; niños checklist = P3 (o se acuerda incluir children en P2).
- Ministerio = grupo; checklist = roster (cerrado 2026-07-13).

**No-Go / pausar** si:

- La iglesia solo quiere “lista de niños el domingo” → evaluar P3 thin sobre un motor mínimo, sin feature casas aún.
- Quieren QR / app móvil primero → reordenar (riesgo: construir UI web que nadie usa).
- Insisten en módulos separados por ministerio → contradice ADR-006; escalar producto.

---

# Parte B — Ejecución (tras análisis aprobado)

## Rol

Ingeniero senior Next.js 16 + Postgres/Supabase multitenant. Implementa el **motor de asistencia MVP** en consola web + migraciones. Sin Flutter. Sin reportes avanzados. Diff mínimo.

## Contexto obligatorio (leer antes de codear)

1. **`.evo/engineering/AI_ENGINEERING_GUIDE.md`**
2. **`AGENTS.md`** + **`.evo/architecture/MULTI_TENANT.md`**
3. Este archivo + **`mejoras/BACKLOG-POST-REUNION-JUL2026.md`** (P2–P4)
4. **`.evo/architecture/DECISION_LOG.md`** ADR-006  
5. **`.evo/architecture/EVENTS.md`** § Relación con Attendance Engine  
6. Patrones SQL/app recientes:
   - `supabase/migrations/20260711120000_profile_pastoral_events.sql`
   - `supabase/migrations/20260713120000_profile_children_registry.sql`
   - `src/lib/services/children.ts`, `src/lib/services/pastoral-events.ts`
   - Listados + drawers: `src/components/children/`, `src/components/members/`
   - Ministerios: `src/lib/ministries/`, `src/lib/services/ministries.ts`

### Prerrequisitos de producto (ya en repo)

| Ítem | Estado |
|------|--------|
| P0 Eventos pastorales | ✅ |
| P1 Niños + tutores | ✅ |
| P1.2 / familia + reporte familias | ✅ |
| P2 Motor asistencia | 📋 este sprint (`feat/attendance-engine`) |
| P2.x Categorías ministerios | Decidido en producto — **fuera** de este sprint |
| P3 / P4 | Fuera de alcance de esta ejecución |

## Decisiones de producto (cerradas)

| # | Decisión |
|---|----------|
| 1 | **Un motor** — `attendance_session` + `attendance_record`; tipos = config. |
| 2 | Tipos MVP en schema: `house_group`, `bible_study`, `children`, `service`. |
| 3 | Status MVP: `present`, `absent`, `late`. |
| 4 | Multitenant: `church_id` + RLS + `fn_assert_session_church`. |
| 5 | Audit log en create/update/delete de sesión y en mutaciones masivas de registros. |
| 6 | Sin Flutter; sin QR; sin portal miembro; sin KPIs. |
| 7 | Checklist `children` → **P3**; P2 enum sí, UI checklist niños no. |
| 8 | Casa / estudio = **`church_ministries`**; no tablas nuevas de programas. |
| 9 | `ministry_id` **requerido** para `house_group` / `bible_study` / `children`; nullable solo si `service`. |
| 10 | Checklist P2 = **roster del ministerio** (no toda la iglesia). |
| 11 | Permisos: `attendance:read` / `attendance:write`. |
| 12 | Ruta `/attendance` top-level; presets UI casa / estudio. |
| 13 | Categorías de ministerios (Discipulado, etc.) → **P2.x** (documentar en PR; no implementar). |

## Decisiones técnicas

- Tablas: `attendance_session`, `attendance_record` (+ índices `(church_id, session_date)`, unique `(session_id, profile_id)`).
- RPCs:
  - `sp_list_attendance_sessions(p_church_id, filtros…)`
  - `sp_get_attendance_session(p_session_id, p_church_id)` — incluye records
  - `sp_maintain_attendance_session(...)` — insert/update/delete sesión
  - `sp_set_attendance_records(...)` — upsert lote de statuses
- Unicidad: un `profile_id` por sesión.
- Checklist: miembros del `ministry_id` (P2). P3 filtrará `is_child` para `children`.
- Permisos: `attendance:*` (seed roles).
- CLI: `npx supabase@2.109.1` (v1 falla con Postgres 17).

## Fuera de alcance P2

- Flutter (P4)
- QR / geolocalización
- KPIs dashboard de asistencia
- Integración obligatoria con `/eventos` (`event_id` nullable OK)
- Asistencia solo-niños pulida (P3)
- `ministry_category` / módulo Discipulado (P2.x)
- Multi-moneda (P5)

## Tareas de implementación

### P2-SQL-1 — Migración

- Tablas + RLS + índices
- RPCs list / get / maintain session / set records
- Audit keys: `actions.attendance.session.*`, `actions.attendance.records.*`
- Permisos seed `attendance:read` / `attendance:write`
- `npx supabase@2.109.1 db push --linked`

### P2-APP-1 — Capa app

- `src/lib/attendance/` — tipos, parse, labels `activity_type` / status
- `src/lib/services/attendance.ts` — wrappers RPC
- Server actions bajo `src/app/apps/church/(console)/attendance/actions.ts`
- Carga de roster vía ministerios existentes

### P2-UI-1 — Consola web

- Listado de sesiones (fecha, tipo, ministerio, conteo presentes)
- Crear / editar sesión (picker ministerio + `activity_type`)
- Presets: “Sesión de casa” / “Sesión de estudio”
- Pantalla checklist: presente/ausente/tarde + guardar lote (roster del ministerio)
- Nav + `route-permissions`
- i18n es/en/fr + claves audit

### P2-QA

- Crear sesión `house_group` o `bible_study` en un ministerio con ≥3 miembros, marcar, reabrir y verificar persistencia
- `npm run build` exit 0

## DoD

```
[ ] Migración aplicada en remoto
[ ] CRUD sesión + set records (lote)
[ ] UI listado + checklist web (roster ministerio)
[ ] Presets casa / estudio
[ ] Tipos como config (no tablas por programa)
[ ] ministry_id según reglas cerradas
[ ] RLS / session church guard
[ ] attendance:read / attendance:write
[ ] Audit + i18n es/en/fr
[ ] npm run build exit 0
[ ] QA manual sesión + 3 registros
[ ] PR nota: P2.x ministry_category diferido
```

## Archivos / rutas probables

| Capa | Ubicación |
|------|-----------|
| Migración | `supabase/migrations/YYYYMMDDHHMMSS_attendance_engine.sql` |
| Lib | `src/lib/attendance/`, `src/lib/services/attendance.ts` |
| Pages | `src/app/apps/church/(console)/attendance/` |
| UI | `src/components/attendance/` |
| Nav | `src/lib/navigation.ts`, `src/lib/auth/route-permissions.ts` |
| i18n | `src/i18n/messages/{es,en,fr}.json` |

---

# Prompts cortos (copiar al chat)

## Prompt corto — Análisis (modo A)

```
@mejoras/ANALISIS-Y-PROMPT-MOTOR-ASISTENCIA.md
@mejoras/BACKLOG-POST-REUNION-JUL2026.md

Lee .evo/engineering/AI_ENGINEERING_GUIDE.md, .evo/architecture/DECISION_LOG.md (ADR-006),
.evo/product/PRODUCT_STRATEGY.md (EPIC 03) y .evo/product/PRODUCT_ROADMAP.md (Fase 3).

MODO A — solo análisis, NO codear.

Evalúa el motor de asistencia: qué buscamos, qué ofrece, importancia, riesgos.
Completa la "Plantilla de respuesta del análisis" (preguntas 1–7 + Go/No-Go).
Recomienda alcance MVP P2 (qué activity_type primero, permisos, ruta UI, P3 diferido o no).
Al final: decisiones abiertas vs cerradas y si se puede pasar a ejecución (modo B).
```

## Prompt corto — Ejecución (modo B)

```
@mejoras/ANALISIS-Y-PROMPT-MOTOR-ASISTENCIA.md
@mejoras/BACKLOG-POST-REUNION-JUL2026.md

Lee .evo/engineering/AI_ENGINEERING_GUIDE.md, AGENTS.md,
.evo/architecture/MULTI_TENANT.md, ADR-006 (.evo/architecture/DECISION_LOG.md),
.evo/architecture/EVENTS.md (§ Relación con Attendance Engine).
Patrones: pastoral_events / children registry (migraciones + services + list/drawer)
y ministerios (src/lib/ministries/, services/ministries).

MODO B — ejecutar P2 motor de asistencia. Diff mínimo. NO Flutter. NO QR. NO KPIs.

### Decisiones de análisis APROBADAS (ver §5 de este doc — 2026-07-13)

- activity_type UI prioritario: house_group + bible_study (presets). service en select OK; children sin checklist UI
- Quién marca: staff web (P4 = campo)
- Status: present | absent | late
- Sesiones sueltas; event_id nullable
- Checklist: roster del ministry_id (NO toda la iglesia). children checklist = P3
- ministry_id requerido para house_group / bible_study / children; nullable solo si service
- Casa/estudio/escuela dominical = church_ministries (NO tablas nuevas ni módulo Discipulado)
- Permisos: attendance:read + attendance:write
- Ruta: /attendance top-level (label Asistencia)
- P2.x ministry_category (Discipulado/Casas/Niños): DECIDIDO en producto, NO implementar; notar en PR

Implementar: SQL sesión+registros + RPCs + RLS + audit + seed permisos,
capa app, listado+checklist web (roster ministerio), presets casa/estudio, i18n es/en/fr.
Rama: feat/attendance-engine. npm run build exit 0.
QA: sesión house_group o bible_study en ministerio con ≥3 miembros, marcar, reabrir, persistencia.
```
