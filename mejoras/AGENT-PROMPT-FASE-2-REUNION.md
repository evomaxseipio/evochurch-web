# Agent prompt — Fase 2 (miembros: salud, oficios y empleo)

Copia este bloque al iniciar una sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-FASE-2-REUNION.md`.

**Origen:** reunión EvoChurch + refinamiento producto (Jul 2026).

**Prerequisito:** Fase 1 mergeada o en rama estable (`feat/fase-1-reunion-ui`).

**Rama sugerida:** `feat/fase-2-member-health-employment`

**Alcance:** consola web Next.js + migración Supabase. Sin Flutter, sin marketplace, sin módulo descuentos/diezmo.

---

## Rol

Eres ingeniero senior Next.js 16 + Postgres/Supabase multitenant. Implementa **Fase 2**: extender el perfil del miembro con salud (tipo de sangre + alergias), oficios (tags libres) y empleo principal estructurado (`profile_employment`).

## Contexto obligatorio (leer antes de codear)

1. **`.ai/engineering/AI_ENGINEERING_GUIDE.md`** — obligatorio: architecture review, impact analysis, KISS/DRY, definition of done
2. `AGENTS.md`
3. `uploads/CONTEXT.md`
4. RPCs actuales: `spgetprofiles`, `sp_get_profile_by_id`, `spinsertprofiles`, `spupdateprofiles`
5. UI perfil: `src/components/members/member-profile-shell.tsx`, `member-profile-view.tsx`

## Decisiones de producto (NO negociar en código)

| # | Decisión |
|---|----------|
| 1 | **Un solo empleo principal** por miembro (`is_primary = true`). Historial opcional con `is_primary = false`. |
| 2 | **Profesiones = tags libres** (texto libre, sin catálogo obligatorio). Normalizar trim + dedupe case-insensitive en servidor. |
| 3 | **Empleo NO obligatorio** aunque tenga profesiones; alergias y sangre también opcionales. |
| 4 | **Alergias** = array JSON de strings (`["Penicilina", "Mariscos"]`). |
| 5 | **Staff** llena todo en consola web en Fase 2. Preparar RPC para auto-servicio futuro del miembro, **sin UI de portal miembro** en esta fase. |
| 6 | **Fuera de alcance:** config diezmo 70/15/15, módulo descuentos, bolsa de empleos / marketplace. |

## Reglas técnicas

- **Tenant:** `church_id` + `fn_assert_session_church` / `fn_assert_profile_in_session_church` en toda RPC nueva o extendida.
- **Migración:** `supabase migration new member_health_professions_employment` (nombre descriptivo).
- **Compatibilidad:** parámetros nuevos en RPCs con `DEFAULT NULL`; no romper Flutter callers existentes.
- **PostgreSQL first:** integridad del empleo principal vía constraint o trigger (máx. 1 `is_primary` por `profile_id`).
- **i18n:** claves en `es.json`, `en.json`, `fr.json` bajo namespace `members`.
- **No commits** salvo que el usuario lo pida.
- Tras cambios: `npm run build` + checklist QA manual.

---

## Modelo de datos

### `profiles` — columnas nuevas

```sql
blood_type   text          NULL          -- ej. 'O+', 'A-'
allergies    jsonb         NOT NULL DEFAULT '[]'::jsonb   -- ["Penicilina", ...]
professions  jsonb         NOT NULL DEFAULT '[]'::jsonb   -- ["Electricista", "Jardinero", ...]
```

- Validar en RPC: arrays de strings no vacíos tras trim; rechazar objetos anidados en v1.
- Índice GIN opcional en `professions` si la búsqueda lo requiere.

### `profile_employment` — tabla nueva

```sql
profile_employment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id       integer NOT NULL REFERENCES church(id),
  employer_name   text,
  job_title       text,
  sector          text,
  work_phone      text,
  work_email      text,
  is_primary      boolean NOT NULL DEFAULT false,
  start_date      date,
  end_date        date,
  source          text NOT NULL DEFAULT 'staff',  -- 'staff' | 'member' (futuro)
  notes           text,
  marketplace_opt_in boolean NOT NULL DEFAULT false,  -- reservado bolsa empleos
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
)
```

**Reglas:**
- Máximo **una** fila con `is_primary = true` por `profile_id` (UNIQUE partial index o trigger).
- Al marcar una fila como principal, desmarcar las demás del mismo perfil.
- RLS: acceso por `church_id` de sesión (mismo patrón que `profiles`).

---

## Tareas (orden recomendado)

### F2-SQL-1 — Migración

**Crear migración** con:

1. `ALTER TABLE profiles` — `blood_type`, `allergies`, `professions`
2. `CREATE TABLE profile_employment` + índices + RLS policies
3. Constraint único: `UNIQUE (profile_id) WHERE is_primary = true` (partial index)
4. Extender **`spupdateprofiles`** y **`spinsertprofiles`** — parámetros opcionales:
   - `p_blood_type`, `p_allergies jsonb`, `p_professions jsonb`
5. Extender **`spgetprofiles`** — devolver campos nuevos en cada miembro; extender **`p_search`** para buscar en `professions` (jsonb array elements, ILIKE)
6. Extender **`sp_get_profile_by_id`** — incluir `bloodType`, `allergies`, `professions`, y array `employment` (o empleo principal + historial)
7. **Nueva RPC** `sp_maintain_profile_employment`:
   - `p_profile_id`, `p_church_id`, `p_action` (`upsert_primary` | `upsert_history` | `delete`)
   - Payload empleo + `fn_assert_session_church`
   - Staff only en Fase 2 (mismo guard que otros RPC de miembros)

**Opcional preparatorio (sin UI):** `sp_maintain_own_profile_extensions` stub documentado para futuro auto-servicio miembro — solo si no amplía scope; si amplía, omitir.

**DoD SQL:**
- [ ] Migración aplica sin error en Supabase local/remoto
- [ ] Un perfil no puede tener 2 empleos `is_primary`
- [ ] Búsqueda `p_search=electricista` encuentra miembros con tag en `professions`

---

### F2-APP-1 — Tipos y servicios

| Archivo | Cambio |
|---------|--------|
| `src/lib/members/types.ts` | `bloodType`, `allergies: string[]`, `professions: string[]`, `ProfileEmployment`, `primaryEmployment` |
| `src/lib/members/parse.ts` | Parsear campos nuevos desde RPC |
| `src/lib/services/members.ts` | Pasar/recibir campos en update; `fetchProfileEmployment` / `maintainProfileEmployment` si aplica |
| `src/app/(app)/members/profile/actions.ts` | Server actions para salud, profesiones y empleo |

**DoD:**
- [ ] Tipos alineados con JSON del RPC
- [ ] Sin `any` innecesario

---

### F2-UI-1 — Perfil: pestaña Salud

Nueva subsección o pestaña **`health`** en perfil de miembro.

| UI | Detalle |
|----|---------|
| Tipo de sangre | `<select>` con opciones comunes (A+, A-, B+, B-, AB+, AB-, O+, O-, Desconocido) + vacío |
| Alergias | Input tags (agregar con Enter/coma, quitar con ×) — reutilizar patrón chip existente si hay |
| Permisos | Solo `canWriteMembers` edita; lectura para el resto |

Archivos probables: `member-profile-view.tsx`, `member-profile-shell.tsx`, `member-profile-toolbar.tsx`, nuevo `member-health-tab.tsx` o sección en form.

---

### F2-UI-2 — Perfil: pestaña Oficios (profesiones)

Pestaña **`professions`** o sección en perfil.

| UI | Detalle |
|----|---------|
| Tags libres | Mismo componente de tags que alergias (extraer `TagListInput` reutilizable — DRY) |
| Hint | "Ej.: Electricista, Abogado, Jardinero — para encontrar hermanos con oficios" |
| No obligatorio | Guardar perfil sin profesiones OK |

---

### F2-UI-3 — Perfil: pestaña Empleo

Pestaña **`employment`**.

| UI | Detalle |
|----|---------|
| Empleo principal | Formulario: empresa, cargo, sector, teléfono trabajo, email trabajo, fecha inicio (opcional) |
| Historial | Lista colapsable de empleos anteriores (`is_primary = false`) — CRUD simple si el tiempo alcanza; mínimo: solo empleo principal |
| No obligatorio | Puede quedar vacío |
| Una principal | UI no permite marcar dos como principal |

---

### F2-UI-4 — Listado: búsqueda por oficio

| Archivo | Cambio |
|---------|--------|
| `src/components/members/members-list-view.tsx` | Placeholder búsqueda menciona oficios; búsqueda server-side ya vía `p_search` |
| Opcional | Columna o chips con 1–2 profesiones visibles en fila desktop |

**DoD:**
- [ ] Buscar "jardinero" en `/members` filtra resultados
- [ ] Perfil muestra tags guardados tras refresh

---

## Architecture review (completar antes de codear)

Responder internamente:

- ¿Existe componente tag/chip input? → reutilizar o extraer uno.
- ¿`spupdateprofiles` ya es el único write path del perfil? → extender, no duplicar.
- ¿Impacto Flutter? → mismos campos en JSON; documentar en comentario migración.

## Impact analysis

| Módulo | Impacto |
|--------|---------|
| Miembros listado/perfil | Alto — cambio principal |
| Reportes | Bajo — sin cambios en Fase 2 |
| Dashboard | Ninguno |
| Flutter (futuro) | Medio — parsear nuevos campos cuando migren |

## Entregables del agente

1. Resumen ejecutivo
2. Archivos modificados + migración SQL
3. Impact analysis y riesgos
4. Checklist QA manual
5. Mejoras detectadas NO implementadas (marketplace, portal miembro, catálogo oficios)

---

## Verificación manual (checklist QA)

```
[ ] Crear/editar miembro con tipo sangre O+ y alergias ["Penicilina"]
[ ] Agregar profesiones ["Electricista", "Jardinero"] — tags libres
[ ] Guardar sin empleo — OK
[ ] Agregar empleo principal (empresa + cargo) — solo uno activo
[ ] /members buscar "electricista" — encuentra al miembro
[ ] Otro miembro sin campos nuevos — sin regresión
[ ] npm run build — exit 0
```

---

## Fuera de alcance (debate paralelo / fases futuras)

- Módulo descuentos / reparto diezmo 70/15/15
- Multi-moneda
- Asistencia, ministerio de niños, eventos pastorales
- Bolsa de empleos (marketplace) — campo `marketplace_opt_in` es solo reserva
- UI auto-servicio del miembro (Flutter / portal)

---

## Prompt corto (copiar/pegar)

```
@mejoras/AGENT-PROMPT-FASE-2-REUNION.md

Lee primero .ai/engineering/AI_ENGINEERING_GUIDE.md (obligatorio).

Implementa Fase 2 en rama feat/fase-2-member-health-employment:

- profiles: blood_type, allergies[], professions[] (tags libres)
- profile_employment: un empleo principal por miembro (no obligatorio)
- RPCs + RLS + UI perfil (salud, oficios, empleo) + búsqueda por oficio
- Sin diezmo/descuentos. npm run build al final.
```
