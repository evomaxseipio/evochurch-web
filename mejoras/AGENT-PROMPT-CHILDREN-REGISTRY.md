# Agent prompt — P1 Registro de niños + tutores

Copia este bloque al iniciar una sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-CHILDREN-REGISTRY.md`.

**Backlog:** `mejoras/BACKLOG-POST-REUNION-JUL2026.md` — **P1**

**Rama sugerida:** `feat/children-registry`

**Alcance:** consola web Next.js + migración Supabase. Sin Flutter. Sin asistencia (P3).

**Prerequisito:** P0 eventos pastorales cerrado (ver contexto abajo).

---

## Rol

Eres ingeniero senior Next.js 16 + Postgres/Supabase multitenant. Implementa el **registro de niños** vinculado a **tutores/padres** (perfiles adultos ya existentes en la iglesia).

## Contexto obligatorio (leer antes de codear)

1. **`.evo/engineering/AI_ENGINEERING_GUIDE.md`**
2. **`AGENTS.md`** + **`.evo/architecture/MULTI_TENANT.md`**
3. **`mejoras/BACKLOG-POST-REUNION-JUL2026.md`** (sección P1)
4. Patrones SQL:
   - `supabase/migrations/20260711120000_profile_pastoral_events.sql`
   - `supabase/migrations/20260709171814_member_health_professions_employment.sql`
5. Patrones app:
   - `src/lib/services/pastoral-events.ts`
   - `src/components/members/add-member-modal.tsx`
   - `src/components/ui/yes-no-field.tsx`

### P0 cerrado — no mezclar dominios

| Dominio | Dónde vive | No va en |
|---------|------------|----------|
| Eventos pastorales del miembro | Perfil → Membresía (timeline) | Dashboard eventos, `/eventos` |
| Eventos eclesiásticos | `/eventos`, card dashboard | Perfil pastoral |
| Reporte pastoral agregado | Futuro P0.1 | — |

La bitácora del dashboard puede mostrar *acciones* administrativas; no confundir con el calendario eclesiástico.

---

## Decisiones de producto (cerradas)

| # | Decisión |
|---|----------|
| 1 | **Registro de niños ≠ asistencia** — P1 solo CRUD; asistencia viene en P3 tras motor P2 (ADR-006). |
| 2 | Niños **no** son miembros adultos por defecto: `is_member = false`, `is_child = true`. |
| 3 | Tutores = FK a `profiles` de adultos (`is_child = false`), mínimo **1** tutor por niño. |
| 4 | Campos MVP: nombre, fecha nacimiento, alergias, contacto emergencia (nombre + teléfono), tutores + relación. |
| 5 | Permisos v1: **`members:read`** listar/ver; **`members:write`** crear/editar/eliminar. |
| 6 | Audit log en create/update/delete vía `fn_append_church_audit_log`. |
| 7 | UI: listado dedicado en consola web; perfil de niño **simplificado** (sin pestañas finanzas). |
| 8 | Niños **no** aparecen mezclados sin distinción en el listado general de adultos. |

## Decisiones técnicas (proponer en PR si cambias algo)

- **Modelo sugerido v1:** columna `profiles.is_child` + tabla puente `profile_child_guardian`.
- Reutilizar en `profiles`: `date_of_birth`, `allergies` (jsonb), `blood_type`, teléfonos.
- Contacto emergencia: columnas en `profiles` o tabla `child_emergency_contact` — justificar en PR.
- Tabla puente: `child_profile_id`, `guardian_profile_id`, `relationship`, `is_primary`, `church_id`.
- Relaciones tutor: `mother`, `father`, `guardian`, `other`.
- RPCs sugeridos:
  - `sp_list_child_profiles(p_church_id, …paginación/filtros)`
  - `sp_get_child_profile(p_child_id, p_church_id)` — incluye tutores
  - `sp_maintain_child_profile(...)` — `insert` / `update` / `delete` + sync tutores
- Guards: `fn_assert_session_church`, validar tutores mismo `church_id` y `is_child = false`.

## Fuera de alcance P1

- Asistencia de niños (P3)
- Motor de asistencia (P2)
- Portal del tutor / auto-registro
- Vínculo con ministerio de niños en calendario `/eventos`
- Permisos RBAC `children:*` (evaluar en P1.1)
- Flutter

---

## Tareas

### P1-SQL-1 — Migración

- `profiles.is_child boolean NOT NULL DEFAULT false` + índice `(church_id, is_child)`
- `profile_child_guardian` + RLS multitenant
- Campos contacto emergencia (definir ubicación)
- RPCs list / get / maintain
- Audit keys: `actions.members.child.create`, `update`, `delete`
- `npx supabase@2.109.1 db push --linked` al final (CLI v2; v1 falla con Postgres 17)

### P1-APP-1 — Capa app

- `src/lib/children/` — tipos, parse, labels de relación tutor
- `src/lib/services/children.ts` — wrappers RPC
- Server actions: `src/app/apps/church/(console)/members/children/actions.ts` (o ruta dedicada)

### P1-UI-1 — Consola web

- Listado niños: nombre, edad, tutores, alergias resumidas
- Drawer/modal crear-editar niño
- Selector tutores: combobox de miembros adultos (reusar `MemberCombobox` si aplica)
- Vista detalle niño (datos relevantes solamente)
- Navegación: `/members/children` o subsección bajo Miembros
- i18n es/en/fr bajo `children.*`

### P1-I18N — Auditoría

- Claves `audit.actions.members.child.*` en **es**, **en**, **fr** (evitar `MISSING_MESSAGE`)

---

## DoD

```
[ ] Migración aplica en remoto
[ ] CRUD niño + asignar/quitar tutores
[ ] Listado muestra solo is_child = true
[ ] Permisos members:read/write respetados
[ ] Audit log en mutaciones + i18n audit
[ ] npm run build exit 0
[ ] QA manual: crear niño con 2 tutores, editar alergias, eliminar
```

---

## Prompt corto (copiar al otro chat)

```
@mejoras/AGENT-PROMPT-CHILDREN-REGISTRY.md
@mejoras/BACKLOG-POST-REUNION-JUL2026.md

Lee .evo/engineering/AI_ENGINEERING_GUIDE.md y AGENTS.md.

P0 cerrado: eventos pastorales solo en perfil miembro (Membresía), no en dashboard/eventos eclesiásticos.

Implementa P1 — Registro de niños + tutores:
- SQL: is_child en profiles + tabla tutores + RPCs + RLS + audit log
- Web: listado + CRUD + vincular tutores (adultos existentes)
- Permisos v1: members:read / members:write
- i18n es/en/fr + claves audit.actions.members.child.*
- Fuera de alcance: asistencia (P2/P3)

Patrones: profile_pastoral_event, profile_employment, pastoral-events service.
Rama: feat/children-registry. npm run build al final.
```
