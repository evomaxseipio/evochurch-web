# Agent prompt — P3 Asistencia de niños

Copia este bloque al iniciar una sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-CHILDREN-ATTENDANCE.md`.

**Backlog:** `mejoras/BACKLOG-POST-REUNION-JUL2026.md` — **P3**

**Rama sugerida:** `feat/attendance-engine` (continuar) o `feat/children-attendance`

**Alcance:** consola web Next.js + ajustes mínimas SQL/RPC si hace falta. **Reutilizar motor P2** — no crear módulo de asistencia paralelo.

**Prerrequisitos (ya en repo):**

| Ítem | Estado |
|------|--------|
| P1 Registro niños + tutores | ✅ |
| P2 Motor asistencia | ✅ código (`/attendance`, RPCs) |
| P2.x Categorías CRUD | ✅ código (`/settings/ministry-categories`) |
| P4 Flutter | Fuera de alcance |
| P5 Multi-moneda | Fuera de alcance |

---

## Rol

Eres ingeniero senior Next.js 16 + Postgres/Supabase multitenant. Extiende el motor de asistencia para que un staff pueda registrar **asistencia de niños** (`activity_type = children`) con checklist de **perfiles `is_child = true`**, no adultos del culto.

## Contexto obligatorio (leer antes de codear)

1. **`.evo/engineering/AI_ENGINEERING_GUIDE.md`**
2. **`AGENTS.md`** + **`.evo/architecture/MULTI_TENANT.md`**
3. **`.evo/architecture/DECISION_LOG.md`** ADR-006 (un motor)
4. **`mejoras/BACKLOG-POST-REUNION-JUL2026.md`** (sección P3)
5. Código base:
   - `supabase/migrations/20260713230000_attendance_engine.sql`
   - `src/lib/attendance/types.ts` — `ATTENDANCE_UI_PRESETS` hoy **excluye** `children` (comentario P3)
   - `src/components/attendance/*` (list, form drawer, checklist)
   - `src/lib/children/`, `src/lib/services/children.ts`
   - Ministerios: roster = `member_profile_ids` (pueden incluir niños)

## Decisiones de producto (cerradas)

| # | Decisión |
|---|----------|
| 1 | **Un motor** — mismo `/attendance`, mismas tablas/RPCs. Sin `/asistencia-ninos` duplicado. |
| 2 | Tipo de sesión: **`activity_type = children`** (ya en CHECK SQL). |
| 3 | **`ministry_id` obligatorio** (igual que casa/estudio) — ministerio de niños / categoría `children`. |
| 4 | Checklist = **solo perfiles `is_child = true`**. Nunca listar adultos como filas de asistencia infantil (aunque estén en el roster del ministerio como líderes). |
| 5 | Universo del checklist (orden de preferencia): |
|   | a) `member_profile_ids` del ministerio **∩** `is_child = true` |
|   | b) Si (a) vacío → todos los niños activos de la iglesia (`is_child`, `is_active`) con mensaje de ayuda: “Agrega niños al roster del ministerio para acotar la lista”. |
| 6 | UI: preset **“Sesión de niños”** en hub de asistencia (junto a casa / estudio). |
| 7 | Permisos: reutilizar **`attendance:read` / `attendance:write`** (sin `children:attendance:*` en v1). |
| 8 | Mostrar en checklist: nombre + edad (o fecha nac.) opcional; **no** bloquear MVP por tutores en la fila. |
| 9 | i18n es/en/fr. |

## Fuera de alcance P3

- Flutter / check-in móvil (P4)
- QR, geolocalización
- Portal del tutor
- Reportes/KPIs de asistencia infantil
- Módulo nav aparte de `/attendance`
- Cambiar CRUD de categorías (P2.x ya cerrado)

## Tareas

### P3-SQL-1 — Roster infantil (si el RPC actual no basta)

Hoy `sp_get_attendance_session` expone `ministryMemberIds` crudos. Opciones (elegir la mínima):

- **A (preferida):** enriquecer respuesta RPC con `checklistProfileIds` cuando `activity_type = children` (filtro `is_child`), **o**
- **B:** filtrar en app al construir rows del checklist (menos ideal si el client carga solo adultos).

Asegurar que el page/loader de checklist pueda resolver nombres de niños (fetch children o members incluyendo `is_child`).

### P3-APP-1 — Tipos y presets

- Incluir `children` en `ATTENDANCE_UI_PRESETS` (o preset dedicado).
- Labels i18n: “Sesión de niños”, hints de ministry picker (preferir categoría code `children`).
- Validación: ministerio requerido; picker prioriza category `children`.

### P3-UI-1 — Checklist niños

- Same `AttendanceChecklistView` / drawer path; ramas solo donde haga falta (filtro `is_child`, empty states).
- Empty clear: ministerio sin niños en roster / sin niños registrados.
- No romper flujos casa / estudio.

### P3-QA

- Crear sesión tipo niños → checklist solo menores → marcar presente/ausente/tarde → reopen persiste.
- Verificar que líderes adultos del ministerio **no** aparecen en la lista.
- `npm run build` exit 0.

## DoD

```
[ ] Preset UI “Sesión de niños” en /attendance
[ ] ministry_id obligatorio + picker prioriza categoría children
[ ] Checklist solo is_child = true
[ ] Guardar / reabrir registros OK
[ ] Casa/estudio sin regresión
[ ] i18n es/en/fr
[ ] npm run build exit 0
```

## Archivos / rutas probables

| Capa | Ubicación |
|------|-----------|
| Types presets | `src/lib/attendance/types.ts` |
| UI | `src/components/attendance/attendance-list-view.tsx`, `attendance-session-form-drawer.tsx`, `attendance-checklist-view.tsx` |
| Page detail | `src/app/apps/church/(console)/attendance/[id]/page.tsx` |
| RPC (si A) | nueva migración sobre `sp_get_attendance_session` |
| i18n | `src/i18n/messages/{es,en,fr}.json` → `attendance.*` |

---

## Prompt corto (copiar al chat)

```
@mejoras/AGENT-PROMPT-CHILDREN-ATTENDANCE.md
@mejoras/BACKLOG-POST-REUNION-JUL2026.md

Lee .evo/engineering/AI_ENGINEERING_GUIDE.md, AGENTS.md, MULTI_TENANT.md, ADR-006.

P2 y P2.x ya están en código. Implementa P3 — Asistencia de niños:
- Mismo hub /attendance (un motor). activity_type=children + ministry_id.
- Preset “Sesión de niños”; picker prioriza categoría children.
- Checklist SOLO is_child=true (no líderes adultos del ministerio).
- Roster: ministry members ∩ niños; si vacío, niños activos de la iglesia + help text.
- i18n es/en/fr. Sin Flutter / QR / reportes.
- No romper casa/estudio. npm run build al final.
```
