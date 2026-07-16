# Agent prompt — P2.x Categorías de ministerios (CRUD por iglesia)

Copia este bloque al iniciar una sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-MINISTRY-CATEGORIES-CRUD.md`.

**Backlog:** `mejoras/BACKLOG-POST-REUNION-JUL2026.md` — **P2.x**

**Rama sugerida:** `feat/attendance-engine` (o `feat/ministry-categories-crud`)

**Alcance:** consola web Next.js + migración Supabase. Diff mínimo. Sin Flutter. Sin asistencia de niños (P3).

**Prerequisito:** P2 motor de asistencia en código (tabla `attendance_session`, hub `/attendance`).

---

## Rol

Eres ingeniero senior Next.js 16 + Postgres/Supabase multitenant. Reemplaza el enum hardcodeado de categorías de ministerios por un **catálogo CRUD por iglesia** con codes semánticos estables para presets de asistencia.

## Contexto obligatorio (leer antes de codear)

1. **`.evo/engineering/AI_ENGINEERING_GUIDE.md`**
2. **`AGENTS.md`** + **`.evo/architecture/MULTI_TENANT.md`**
3. **`mejoras/BACKLOG-POST-REUNION-JUL2026.md`** (sección P2.x)
4. Patrones SQL/app:
   - `supabase/migrations/20260713240000_ministry_category.sql` (CHECK enum a reemplazar)
   - `supabase/migrations/20260703100000_settings_catalog_granular_permissions.sql`
   - `src/lib/services/income-types-catalog.ts` + `/settings/income-types`
   - `src/lib/ministries/types.ts`, `ministry-form-drawer.tsx`, attendance picker

---

## Decisión de producto (cerrada — 2026-07-14)

| # | Decisión |
|---|----------|
| 1 | **P2.x deja de ser enum hardcodeado** — no `CHECK` fijo en app ni solo TS const. |
| 2 | **CRUD de categorías POR IGLESIA** (`church_id` + RLS). |
| 3 | Semilla de sistema (no borrables): `discipleship`, `house_group`, **`cell_group` (Célula)**, `children`, `worship`, `other`. |
| 4 | `church_ministries.ministry_category` guarda el **code** (texto) con FK `(church_id, code)`. |
| 5 | Attendance presets filtran ministerios por **code semántico** (`house_group` / `cell_group`, `discipleship`, `children`, `worship`, `other`). |
| 6 | UI admin bajo settings (mismo patrón income/expense): listado + drawer. |
| 7 | Select de categoría en formulario de ministerio **desde BD** (no `MINISTRY_CATEGORIES` hardcode). |
| 8 | **No borrar** categoría en uso (FK) ni categorías `is_system`. |
| 9 | i18n es/en/fr para pantallas/permisos; nombres de categoría viven en BD (editables). |
| 10 | Permisos: `settings:ministry_categories:read\|write\|delete`. |

## Fuera de alcance

- Asistencia de niños (P3)
- Flutter (P4)
- Módulo “Discipulado/Estudios” aparte (piel filtrada OK después)
- Cambiar `activity_type` de sesiones

---

## Tareas

### P2x-SQL — Migración

- Tabla `ministry_category` + RLS tenant + seed por iglesia + trigger en altas de iglesia
- Drop CHECK de `20260713240000`; normalizar values huérfanos → `other`; FK a `(church_id, code)`
- `app_permissions` + grants a roles que ya tienen `settings:income_types:*`

### P2x-APP — Service + actions

- `src/lib/services/ministry-categories.ts` (+ tipos/parse)
- Actions en `/settings/ministry-categories`
- `fetchMinistries` sigue leyendo `ministry_category` (code); validar contra catálogo al guardar

### P2x-UI

- `/settings/ministry-categories` listado + drawer (reutilizar stack catalog/)
- Nav Configuración sistema + route permission
- `ministry-form-drawer` / filtros / chips: options desde categorías activas (`name` de BD)
- Attendance picker: preferir codes semánticos (casa → `house_group` + `cell_group`)

### P2x-QA

- i18n es/en/fr
- `npm run build` exit 0
- Actualizar `QA-ATTENDANCE-P2.md` sección A (CRUD + Célula)

---

## DoD

- [x] Migración SQL creada y aplicable sobre `20260713240000`
- [x] CRUD categorías por iglesia (crear custom, editar nombre, no borrar sistema/en uso)
- [x] Seed incluye **Célula** (`cell_group`)
- [x] Formulario ministerio + filtros cargan categorías desde BD
- [x] Presets asistencia priorizan por code semántico
- [x] i18n + permisos RBAC
- [x] `npm run build` exit 0

## Siguiente

**P3 — Niños: asistencia** (checklist de niños registrados en sesiones `children`).
