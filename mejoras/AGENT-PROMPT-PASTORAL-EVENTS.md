# Agent prompt — P0 Eventos pastorales del miembro

Copia este bloque al iniciar una sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-PASTORAL-EVENTS.md`.

**Backlog:** `mejoras/BACKLOG-POST-REUNION-JUL2026.md` — **P0**

**Rama sugerida:** `feat/pastoral-member-events`

**Alcance:** consola web Next.js + migración Supabase. Sin Flutter, sin vínculo financiero.

---

## Rol

Eres ingeniero senior Next.js 16 + Postgres/Supabase multitenant. Implementa la **bitácora pastoral por miembro**: timeline de eventos relevantes (enfermedad, emergencia, recolecta, etc.).

## Contexto obligatorio (leer antes de codear)

1. **`.evo/engineering/AI_ENGINEERING_GUIDE.md`**
2. `AGENTS.md`
3. `mejoras/BACKLOG-POST-REUNION-JUL2026.md`
4. Patrones: `profile_employment` + `sp_maintain_profile_employment`

## Decisiones de producto (cerradas)

| # | Decisión |
|---|----------|
| 1 | Entidad **`profile_pastoral_event`** — un evento por fila, ligado a `profile_id`. |
| 2 | **`event_type`** enum text: `illness`, `accident`, `family_loss`, `financial_aid`, `emergency`, `collection`, `recognition`, `discipleship`, `other`. |
| 3 | **`event_date`** obligatorio; `title` opcional (default = label del tipo); `description` opcional. |
| 4 | Permisos: **`members:read`** listar; **`members:write`** CRUD. |
| 5 | Audit log en create/update/delete vía `fn_append_church_audit_log`. |
| 6 | UI: pestaña **`pastoral`** en perfil del miembro. |
| 7 | **No** reemplazar campo `pastoralNotes` del perfil — conviven. |

## Tareas

### P0-SQL-1 — Migración

- Tabla + RLS + índices
- `sp_list_profile_pastoral_events(p_profile_id, p_church_id)`
- `sp_maintain_profile_pastoral_event(...)` — actions: `insert`, `update`, `delete`

### P0-APP-1 — Tipos y servicios

- `src/lib/members/pastoral-events.ts` — tipos + labels
- `src/lib/services/pastoral-events.ts` — fetch + maintain

### P0-UI-1 — Pestaña Pastoral

- `member-pastoral-tab.tsx` — timeline + formulario
- Integrar en `member-profile-shell`, `member-profile-view`, `page.tsx`

### P0-I18N — es/en/fr

Claves bajo `members.pastoral*` y `members.tabPastoral`.

## DoD

```
[ ] Migración aplica
[ ] Tab pastoral en perfil con timeline
[ ] CRUD eventos (staff con members:write)
[ ] npm run build exit 0
```

## Prompt corto

```
@mejoras/AGENT-PROMPT-PASTORAL-EVENTS.md

Lee .evo/engineering/AI_ENGINEERING_GUIDE.md.

Implementa P0 eventos pastorales: SQL + RPC + pestaña Pastoral en perfil.
Sin vínculo finanzas. npm run build al final.
```
