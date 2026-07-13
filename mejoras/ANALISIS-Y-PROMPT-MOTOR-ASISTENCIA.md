# Análisis + Prompt — P2 Motor de asistencia (Attendance Engine)

**Backlog:** [`BACKLOG-POST-REUNION-JUL2026.md`](./BACKLOG-POST-REUNION-JUL2026.md) — **P2**  
**EDK:** EPIC 03 · ADR-006 · [`PRODUCT_STRATEGY.md`](../.evo/product/PRODUCT_STRATEGY.md) · [`PRODUCT_ROADMAP.md`](../.evo/product/PRODUCT_ROADMAP.md) Fase 3  
**Rama sugerida (cuando se ejecute):** `feat/attendance-engine`

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

**Principio (cerrado):** un solo motor — **no** cuatro módulos duplicados (culto, casa, niños, escuela). Casas fuente y estudios son **configuraciones** (`activity_type`), no tablas separadas.  
Ref: ADR-006, `AI_BUSINESS_RULES.md` § Motor de asistencia.

## 2. Qué nos ofrece

### Valor inmediato (P2 — consola web)

- Crear **sesión** (fecha + tipo + iglesia [+ ministerio / evento opcional]).
- Marcar **registros**: presente / ausente / tarde.
- Historial por sesión y base para historial por persona.
- RPCs estables que Flutter reutilizará en **P4** sin reescribir backend.

### Valor en cadena (lo que desbloquea)

| Después | Depende de P2 |
|---------|----------------|
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
Opcional: P1.3 household
Al final: P5 multi-moneda
```

## 4. Modelo mental (propuesto)

```
attendance_session
  church_id
  session_date
  activity_type   -- house_group | bible_study | children | service
  ministry_id?    -- opcional
  event_id?       -- opcional (vínculo futuro a /eventos)
  title? / notes?
  created_by_profile_id?

attendance_record
  session_id
  profile_id
  status          -- present | absent | late
  church_id       -- denormalizado para RLS / queries
  notes?
```

**Regla:** una sesión → muchos registros. No inventar “asistencia de casa” como entidad aparte.

## 5. Preguntas de evaluación (responder en análisis)

Antes de ejecutar, el agente de análisis / producto debe documentar respuestas (tabla al final de esta sección):

1. **¿Qué actividad duele más hoy?** Casas fuente, estudios, niños o culto → define el primer `activity_type` del MVP UI.
2. **¿Quién marca asistencia?** Solo staff en oficina, o líderes de casa (afecta permisos y urgencia de P4 móvil).
3. **¿Status MVP?** Solo `present` / `absent`, o también `late` (propuesto) / justificado / invitado.
4. **¿Cómo nace la sesión?** Sueltas en MVP, o ya vinculadas a `/eventos`.
5. **¿Quién aparece en el checklist?**
   - `house_group` / `bible_study` / `service` → miembros adultos (`is_child = false`)
   - `children` → solo niños (puede **diferirse a P3** y en P2 dejar el tipo en enum sin UI)
6. **¿Permisos v1?** Reutilizar algo existente vs `attendance:read` / `attendance:write` nuevos.
7. **¿Dónde vive en la UI?** Entrada de menú propia (`/attendance` o `/asistencia`), bajo Ministerios, o bajo Eventos.

### Plantilla de respuesta del análisis

Completar y pegar al final del PR / chat antes de modo B:

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | Primer activity_type del MVP UI | |
| 2 | Quién marca | |
| 3 | Status MVP | |
| 4 | Sesión suelta vs event_id | |
| 5 | Universo del checklist (P2 vs P3) | |
| 6 | Permisos | |
| 7 | Ruta / nav | |
| — | Go / No-Go a ejecución | |
| — | Notas / riesgos | |

## 6. Criterios Go / No-Go

**Go a ejecución (modo B)** si:

- Hay al menos un `activity_type` priorizado para UI.
- Se acepta schema sesión + registro (ADR-006).
- Queda claro: P2 = web; Flutter = P4; niños checklist = P3 (o se acuerda incluir children en P2).

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

### Prerrequisitos de producto (ya en repo)

| Ítem | Estado |
|------|--------|
| P0 Eventos pastorales | ✅ (solo perfil; no dashboard eventos) |
| P1 Niños + tutores | ✅ |
| P1.2 / familia + reporte familias | ✅ |
| P2 Motor asistencia | 📋 este sprint |
| P3 / P4 | Fuera de alcance de esta ejecución |

## Decisiones de producto (cerradas en arquitectura)

| # | Decisión |
|---|----------|
| 1 | **Un motor** — `attendance_session` + `attendance_record`; tipos = config. |
| 2 | Tipos MVP en schema: `house_group`, `bible_study`, `children`, `service`. |
| 3 | Status MVP: `present`, `absent`, `late` (salvo análisis diga solo present/absent). |
| 4 | Multitenant: `church_id` + RLS + `fn_assert_session_church`. |
| 5 | Audit log en create/update/delete de sesión y en mutaciones masivas de registros. |
| 6 | Sin Flutter; sin QR; sin portal miembro. |
| 7 | Checklist `children` **completo** puede ir en P3; P2 puede exponer el tipo en enum y UI de adultos primero (confirmar plantilla análisis). |

## Decisiones técnicas (proponer en PR si cambias)

- Tablas: `attendance_session`, `attendance_record` (+ índices `(church_id, session_date)`, `(session_id, profile_id)` unique).
- RPCs sugeridos:
  - `sp_list_attendance_sessions(p_church_id, filtros…)`
  - `sp_get_attendance_session(p_session_id, p_church_id)` — incluye records
  - `sp_maintain_attendance_session(...)` — insert/update/delete sesión
  - `sp_set_attendance_records(...)` — upsert lote de statuses
- Unicidad: un `profile_id` por sesión.
- Checklist: perfiles del tenant según `activity_type` (adulto vs niño).
- Permisos: documentar decisión del análisis (`attendance:*` vs reutilizar).
- CLI: `npx supabase@2.109.1` (v1 falla con Postgres 17).

## Fuera de alcance P2

- Flutter (P4)
- QR / geolocalización
- KPIs dashboard de asistencia
- Integración obligatoria con `/eventos` (opcional `event_id` nullable OK)
- Asistencia solo-niños pulida (P3) si el análisis la diferió
- Multi-moneda (P5)

## Tareas de implementación

### P2-SQL-1 — Migración

- Tablas + RLS + índices
- RPCs list / get / maintain session / set records
- Audit keys: `actions.attendance.session.*`, `actions.attendance.records.*` (o naming acordado)
- `npx supabase@2.109.1 db push --linked`

### P2-APP-1 — Capa app

- `src/lib/attendance/` — tipos, parse, labels `activity_type` / status
- `src/lib/services/attendance.ts` — wrappers RPC
- Server actions bajo ruta dedicada (ej. `src/app/apps/church/(console)/attendance/actions.ts`)

### P2-UI-1 — Consola web

- Listado de sesiones (fecha, tipo, conteo presentes)
- Crear / editar sesión
- Pantalla checklist: marcar presente/ausente/tarde + guardar lote
- Nav + `route-permissions`
- i18n es/en/fr + claves audit

### P2-QA

- Crear sesión `bible_study` o `house_group`, marcar 3 perfiles, reabrir y verificar persistencia
- `npm run build` exit 0

## DoD

```
[ ] Migración aplicada en remoto
[ ] CRUD sesión + set records (lote)
[ ] UI listado + checklist web
[ ] Tipos como config (no tablas por ministerio)
[ ] RLS / session church guard
[ ] Audit + i18n es/en/fr
[ ] npm run build exit 0
[ ] QA manual sesión + 3 registros
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

Lee .evo/engineering/AI_ENGINEERING_GUIDE.md, AGENTS.md, MULTI_TENANT.md, ADR-006.

MODO B — ejecutar P2 motor de asistencia.

Asumir decisiones del análisis aprobado (pegar tabla aquí si existe):
- activity_type UI prioritario: <…>
- permisos: <…>
- ruta: <…>
- children checklist: P2 | P3

Implementar: SQL sesión+registros + RPCs + RLS + audit, capa app, listado+checklist web, i18n.
Sin Flutter, sin QR, sin KPIs dashboard. Rama feat/attendance-engine. npm run build al final.
```
