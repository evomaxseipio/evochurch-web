# Agent prompt — P1.2 Familia en perfil de miembro

Copia este bloque al iniciar una sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-MEMBER-FAMILY.md`.

**Backlog:** `mejoras/BACKLOG-POST-REUNION-JUL2026.md` — **P1.2**

**Mockup:** `mockup/member-family-mockup.html` (abrir en navegador; barra inferior cambia vistas)

**Rama sugerida:** `feat/member-family`

**Alcance:** consola web Next.js + migración Supabase mínima. Sin Flutter. Sin módulo `/familias` separado.

**Prerequisito:** P1 registro de niños cerrado (`profile_child_guardian`, `is_child`, CRUD niños).

---

## Rol

Eres ingeniero senior Next.js 16 + Postgres/Supabase multitenant. Extiende el **CRM pastoral** con vista **Familia** en el perfil del **adulto**, reutilizando tutores P1 y sin duplicar el registro de niños.

## Contexto obligatorio (leer antes de codear)

1. **`.evo/engineering/AI_ENGINEERING_GUIDE.md`**
2. **`AGENTS.md`** + **`.evo/architecture/MULTI_TENANT.md`**
3. **`mejoras/BACKLOG-POST-REUNION-JUL2026.md`** (P1.2)
4. **`mejoras/AGENT-PROMPT-CHILDREN-REGISTRY.md`** (P1 entregado)
5. **Mockup:** `mockup/member-family-mockup.html`
6. Patrones UI: `src/components/ui/drawer-form.tsx`, `src/components/children/child-form-drawer.tsx`, `member-profile-view.tsx`

### Caso de uso referencia (mockup)

- **Juan Pérez** — miembro adulto, casado con **María Pérez** (miembro).
- Tres hijos en registro infantil: José (9), Ana (7), Luis (2).
- Desde perfil de Juan → pestaña **Familia**: ver cónyuge, listar hijos, registrar hijo con tutores pre-cargados.

---

## Decisiones de producto (cerradas)

| # | Decisión |
|---|----------|
| 1 | **No** es un módulo nuevo en el menú — vive en **perfil adulto → pestaña Familia**. |
| 2 | **Hijos** = perfiles `is_child = true` ya existentes; lista por consulta inversa a `profile_child_guardian`. |
| 3 | **Cónyuge** = vínculo opcional entre dos perfiles adultos (`is_child = false`), misma iglesia. |
| 4 | **Registrar hijo** desde Familia abre el **mismo drawer P1** con tutores sugeridos (adulto actual + cónyuge si hay). |
| 5 | Permisos v1: **`members:read`** ver; **`members:write`** vincular cónyuge y acciones de hijos. |
| 6 | **No** incluye hogar/dirección compartida en MVP — **may-have diferido** (familia + reporte bastan; no en backlog activo). |
| 7 | **No** incluye hermanos entre niños ni graduación niño→miembro (→ backlog futuro). |
| 8 | Jóvenes/adolescentes **miembros** siguen en listado adultos; solo menores del ministerio infantil en registro niños. |

## Decisiones técnicas (MVP P1.2)

### SQL

- Tabla `profile_spouse` (o columna simétrica): `profile_id`, `spouse_profile_id`, `church_id`, UNIQUE por perfil.
- RPC `sp_get_member_family(p_profile_id, p_church_id)` → `{ spouse, children[] }` (children desde guardians).
- RPC `sp_link_profile_spouse` / `sp_unlink_profile_spouse` con guards multitenant.
- Reutilizar `sp_maintain_child_profile` para alta; no duplicar lógica de niños.

### App

- `src/lib/members/family.ts` — tipos + parse
- `src/lib/services/member-family.ts` — wrappers RPC
- Pestaña `family` en `member-profile-toolbar` + `MemberFamilyTab` component
- Query param `?tab=family` en `/members/profile?id=…`
- Pre-fill en `ChildFormDrawer`: prop `defaultGuardians?: ChildGuardianInput[]`
- i18n `members.family.*` + audit opcional `actions.members.spouse.link`

### Fuera de alcance P1.2

- Hogar formal / dirección compartida — **may-have diferido** (fuera del backlog activo, 2026-07-14)
- Reportes CEAD por familia
- Flutter
- Asistencia (P2/P3)

---

## Tareas

### P1.2-SQL-1 — Cónyuge + RPC familia

- `profile_spouse` + RLS
- `sp_get_member_family`
- `sp_link_profile_spouse` / `sp_unlink_profile_spouse`

### P1.2-APP-1 — Servicios y tipos

- `member-family.ts` service + parse

### P1.2-UI-1 — Pestaña Familia

- Tab en perfil adulto (oculta si `member.isChild` — redirect ya existe)
- Bloque cónyuge + lista hijos + CTAs
- Estado vacío (mockup vista B)

### P1.2-UI-2 — Drawer hijo contextual

- Abrir `ChildFormDrawer` desde Familia con tutores pre-cargados
- Tras guardar, refresh pestaña Familia

### P1.2-UI-3 — (Opcional) Columna familia en listado niños

- Apellido del niño o label derivado; baja prioridad

### P1.2-I18N — es/en/fr

- `members.family.*`, audit si aplica

---

## DoD

```
[ ] Mockup revisado con pastor/secretario (opcional)
[ ] Pestaña Familia en perfil adulto
[ ] Vincular / quitar cónyuge (miembros adultos)
[ ] Lista hijos donde el adulto es tutor
[ ] Registrar hijo desde Familia con tutores pre-cargados
[ ] Permisos members:read/write
[ ] i18n es/en/fr
[ ] npm run build exit 0
[ ] Migración aplicada en remoto
```

---

## Prompt corto

```
@mejoras/AGENT-PROMPT-MEMBER-FAMILY.md
@mejoras/BACKLOG-POST-REUNION-JUL2026.md
@mockup/member-family-mockup.html

Lee .evo/engineering/AI_ENGINEERING_GUIDE.md.

Implementa P1.2 — Familia en perfil miembro (cónyuge + hijos + drawer contextual).
Rama: feat/member-family. npm run build al final.
```
