# Agent prompt — Perfil de iglesia, red local y enterprise (Concilio)

Copia el bloque **Prompt para agente** al iniciar una sesión, o referencia con `@mejoras/AGENT-PROMPT-CHURCH-PROFILE-ENTERPRISE.md`.

**Ramas (una por fase — obligatorio):**

| Fase | Rama | Base (checkout desde) |
|------|------|------------------------|
| Fase 1 — Perfil de iglesia | `feat/church-profile` | `main` |
| Fase 2 — Red sede/hijas | `feat/church-network` | `feat/church-profile` *(o `main` si Fase 1 ya mergeada)* |
| Fase 3 — Organization + portal concilio | `feat/org-enterprise` | `feat/church-network` *(o `main` si Fases 1–2 mergeadas)* |

**Orden de ejecución:** Fase 1 → Fase 2 → Fase 3. **No paralelizar fases** del mismo plan. Otros features pueden ir en ramas aparte (ver § Workflow Git).

**Alcance total:** configuración por tenant, jerarquía local, producto enterprise denominacional (Asambleas de Dios y similares).

**Principios:** **DRY** (un `church_id` operativo, mismos RPCs Flutter + Next) + **KISS** (fases incrementales; no implementar Fase 3 antes de Fase 1).

---

## Prompt para agente

```
Eres ingeniero senior Next.js 16 + Postgres/Supabase multitenant en evochurch-web.

Implementa UNA fase según @mejoras/AGENT-PROMPT-CHURCH-PROFILE-ENTERPRISE.md (§ Workflow Git + § Tareas por fase).

Al INICIAR (obligatorio):
1. Lee AGENTS.md y uploads/CONTEXT.md.
2. Ejecuta § Workflow Git → “Inicio de fase” (crear/checkout rama de la fase).
3. Confirma en chat: rama activa + fase (CP / CN / OE).

Reglas de código:
- BD autoriza; UI solo refleja. Nunca confiar en JWT/app_metadata para permisos.
- Tenant operativo: church_id solo desde getAppSession() / getActionSession() → sp_get_session_context().
- Migraciones: supabase migration new <nombre> antes de escribir SQL.
- Mutaciones sensibles vía RPC con fn_assert_session_church() + fn_user_has_permission().
- Registrar cambios de perfil de iglesia en church_audit_log (módulo settings).
- DRY: un perfil de iglesia en BD; branding en UI vía ChurchBrandProvider (CSS variables).
- KISS: no herencia de logo/colores entre iglesias; cada church tiene los suyos.

Al CERRAR fase (obligatorio si pruebas OK):
1. Ejecuta checklist § Workflow Git → “Cierre de fase”.
2. Commit + push a la rama de la fase.
3. Deja handoff § Workflow Git → “Entrega al siguiente agente”.
4. NO empieces la siguiente fase en la misma sesión salvo que el usuario lo pida.

Orden: tareas CP/CN/OE en orden. Marca DoD antes de pasar a la siguiente.
```

---

## Workflow Git — ramas, pruebas, commit y handoff

Cada **fase = un agente (o sesión) = una rama**. Al terminar pruebas OK: **commit + push** y entregar al siguiente agente.

### Inicio de fase (primer paso del agente)

```bash
# 1. Estado limpio
git status
git fetch origin

# 2. Base según fase (ver tabla arriba)
# Fase 1:
git checkout main && git pull origin main
git checkout -b feat/church-profile

# Fase 2 (Fase 1 pushed, aún no en main):
git fetch origin
git checkout -b feat/church-network origin/feat/church-profile
# — o si Fase 1 ya mergeada:
# git checkout main && git pull && git checkout -b feat/church-network

# Fase 3 (Fase 2 pushed, aún no en main):
git fetch origin
git checkout -b feat/org-enterprise origin/feat/church-network
# — o desde main si Fases 1–2 mergeadas

# 3. Confirmar
git branch --show-current
```

**Trabajo aislado (opcional):** otro agente en otro feature puede usar `git worktree add ../evochurch-web-OTRO feat/otro-feature` — no compartir working tree con otra fase de *este* plan.

### Durante la fase

- Commits **intermedios** opcionales en la misma rama (mensajes pequeños).
- **Un solo agente** por rama `feat/church-profile` | `feat/church-network` | `feat/org-enterprise`.
- Si hay migración SQL: aplicar en Supabase dev (`supabase db push` o SQL editor) **antes** de probar RPCs/UI.
- No tocar ramas de otras fases.

### Cierre de fase — checklist de pruebas (obligatorio)

Ejecutar **todos** los que apliquen a la fase. Si alguno falla, **no** commit final ni push.

| # | Comando / verificación | Fase |
|---|------------------------|------|
| T1 | `npm run build` — exit 0 | 1, 2, 3 |
| T2 | `npm run lint` — sin errores nuevos | 1, 2, 3 |
| T3 | Migración aplicada en dev; RPCs nuevos responden | 1, 2, 3 |
| T4 | Smoke manual: `/settings/church` guarda perfil, slug, colores | 1 |
| T5 | Smoke: shell muestra logo/colores del tenant | 1 |
| T6 | `npm run qa:rbac` — permisos `settings:church:*` OK | 1 |
| T7 | Sede ve hija read-only; hija no ve sede/hermanas | 2 |
| T8 | Smoke portal org (host / ruta `(org)`) + login redirect | 3 |

### Cierre de fase — commit y push (obligatorio si T1–Tn OK)

```bash
git status
git diff

# Stage solo archivos de esta fase (no .env, credenciales)
git add supabase/migrations/ src/ mejoras/  # ajustar paths reales

git commit -m "$(cat <<'EOF'
feat(church-profile): perfil de iglesia — Fase 1

Perfil tenant: slug, logo, 3 colores hex, contacto, RPCs y UI /settings/church.
EOF
)"

# Ajustar prefijo según fase:
# Fase 2: feat(church-network): red sede/hijas — Fase 2
# Fase 3: feat(org-enterprise): portal concilio — Fase 3

git push -u origin HEAD
```

**Reglas commit:**

- Un commit **de cierre** por fase (squash intermedio opcional antes).
- Mensaje: `feat(<scope>): <resumen> — Fase N` + cuerpo con RPCs/rutas tocadas.
- **Nunca** `--force` a `main`/`master`.
- **Nunca** commitear `.env.local`, keys, service role.

### Entrega al siguiente agente (handoff)

Al terminar push, dejar en chat (o PR description):

```markdown
## Handoff — Fase N completada

- **Rama:** feat/church-profile
- **Push:** origin/feat/church-profile
- **Migraciones:** supabase/migrations/YYYYMMDD_*.sql (aplicada en dev: sí/no)
- **Pruebas:** build ✅ | lint ✅ | qa:rbac ✅ | smoke ✅
- **Siguiente:** Fase 2 → agente nuevo en `feat/church-network` desde esta rama
- **Notas:** …
```

**Flujo entre fases:**

```text
Agente 1 → feat/church-profile  → push → handoff
Agente 2 → feat/church-network  (desde profile) → push → handoff
Agente 3 → feat/org-enterprise  (desde network) → push → handoff
Humano   → PR / merge a main por fase (recomendado) o al final
```

**Merge a `main`:** responsabilidad humana o agente explícitamente pedido. Tras merge Fase 1, Fase 2 puede ramificarse desde `main` actualizado.

### Paralelismo con otros features

| Escenario | ¿Paralelo? |
|-----------|------------|
| Fase 1 + Fase 2 del **mismo** plan | ❌ Secuencial |
| Fase 1 + rama `feat/otro-modulo` | ✅ Si no tocan mismos archivos hub |
| Dos agentes en **misma** rama | ❌ Prohibido |
| Dos migraciones SQL simultáneas | ❌ Coordinar; una fase a la vez en `supabase/migrations/` |

Archivos hub — evitar editar en paralelo: `app-session.ts`, `permission-keys.ts`, `navigation.ts`, `sp_get_session_context` en migraciones.

---

## 1. Resumen ejecutivo

EvoChurch evoluciona de un **SaaS multitenant plano** (1 iglesia = 1 tenant) hacia:

1. **Perfil de iglesia** — logo, 3 colores hex, nombre, contacto, slug (Fase 1).
2. **Red local sede + sucursales** — finanzas propias; sede ve hijas read-only (Fase 2).
3. **Enterprise denominacional** — Concilio audita iglesias afiliadas en portal aparte (Fase 3).

`church_id` **sigue siendo el eje operativo** (miembros, finanzas, eventos, RBAC). La organización envuelve y agrega; no reemplaza el tenant.

---

## 2. Lo que tenemos hoy

### 2.1 Modelo multitenant

```text
Usuario (auth.uid)
  └── auth_users → profile_id
        └── profiles.church_id  (1 perfil = 1 iglesia, fijo)
              └── church (tenant operativo)
                    ├── miembros, finanzas, fondos, eventos
                    ├── roles y permisos (RBAC por iglesia)
                    └── RLS: fn_get_session_church_id()
```

| Componente | Estado |
|------------|--------|
| Sesión | `getAppSession()` → `churchId`, `churchName`, `permissions[]` |
| Tabla `church` | `id`, `name`, `timezone`; RLS solo SELECT |
| Branding | Hardcodeado Fuente Inagotable (`src/lib/brand/`) |
| Colores | Tokens globales `src/styles/design.css` |
| Settings `/settings` | Perfil **usuario**, no iglesia |
| Jerarquía padre/hija | No existe |
| Organization / Concilio | No existe como tenant |
| Multi-iglesia admin | No soportado |

### 2.2 “Concilio” en código actual

Es **formato de reporte** (CEAD, F.001 Asambleas de Dios), no organización:

- `src/lib/reports/templates/concilio/`, `cead/constants.ts`
- Campos `presbyterio`, `churchCode`, `councilHeader` en **mocks** — no en BD
- Generación por **una** iglesia; sin consolidación ni workflow de envío

### 2.3 Archivos clave

| Archivo | Uso |
|---------|-----|
| `src/lib/auth/app-session.ts` | Sesión multitenant |
| `src/lib/brand/` | Brand estático (reemplazar gradualmente) |
| `src/components/brand/church-logo.tsx` | Logo hardcodeado |
| `src/styles/design.css` | Tokens CSS globales |
| `src/app/(app)/settings/` | Settings usuario + catálogos |
| `src/lib/reports/templates/concilio/f001-types.ts` | Metadatos F.001 |
| `supabase/migrations/*session_context*` | `sp_get_session_context` |

---

## 3. Lo que queremos lograr

### Fase 1 — Perfil de iglesia (standalone y base para todo)

Cada iglesia configura:

| Campo | Uso |
|-------|-----|
| Nombre, nombre corto, nombre legal | UI, reportes |
| Logo propio (upload) | Shell, login, informes, sitio público |
| 3 colores `#RRGGBB` | Theme por tenant (`primary`, `secondary`, `accent`) |
| Dirección, ciudad, país, teléfono, email, web | Reportes, contacto |
| **Slug obligatorio único** | Sitio público por iglesia |
| `external_code`, presbiterio | F.001 / CEAD desde BD |
| Timezone, default_locale | Operación (timezone ya existe) |

### Fase 2 — Red sede + sucursales

Ejemplo: Jerusalén (sede) → Jerusalén Santa Fe, Jerusalén 2.

| Regla | Decisión |
|-------|----------|
| Finanzas | **Propias** — cada sucursal = `church_id` separado |
| Visibilidad | **Sede ve hijas (read); hijas solo ven la suya** |
| Miembros multi-iglesia | **No** — un miembro, una iglesia |
| Branding | **Individual** — cada iglesia su logo y 3 colores |
| Slug | **Individual obligatorio** por iglesia |

### Fase 3 — Enterprise (Concilio)

Ejemplo: Concilio Evangélico Asambleas de Dios.

| Regla | Decisión |
|-------|----------|
| Rol del concilio | **Solo audita** — read + reportes agregados; sin editar iglesias |
| Producto | **Opción C** — portal aparte, backend compartido (ver §4.4) |
| Iglesias | Operan en consola normal; concilio recibe/consolida F.001 |

---

## 4. Decisiones de producto — CERRADAS

| # | Tema | Decisión |
|---|------|----------|
| 1 | Finanzas sucursales | **Propias** — `church_id` separado por sucursal |
| 2 | Visibilidad red | **Sede read hijas; hijas solo su tenant** |
| 3 | Miembro multi-iglesia | **No** |
| 4 | Concilio vs iglesias | **Solo audita** |
| 5 | Logo | **Individual por iglesia** — sin herencia |
| 6 | Slug | **Sí, obligatorio e individual** — URL pública por iglesia |
| 7 | Producto enterprise | **Opción C** — portal URL aparte, mismo backend/deploy |
| 8 | Colores | **Máximo 3, hexadecimal** `#RRGGBB` por iglesia |

### 4.1 Punto 7 — Enterprise (Opción C, cerrada)

```text
                    ┌─────────────────────────┐
                    │   Supabase (único)      │
                    │   church, organization  │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
   app.evochurch.app                    concilio.evochurch.app
   (route group (app))                  (route group (org))
   • Login iglesia                      • Login org / concilio
   • /dashboard, /members…             • /org/dashboard, /org/churches…
   • ChurchBrandProvider               • OrgBrandProvider
```

- **Un repo, un deploy**, dos experiencias por `Host` header + middleware.
- Usuario iglesia en `concilio.*` → redirect/mensaje claro.
- Usuario org en `app.*` → redirect/mensaje claro.
- Cuentas org vs iglesia: preferir **cuentas separadas**; si dual membership en futuro, selector solo en login.
- **No implementar portal org en Fase 1** — solo dejar decisión documentada y route group stub opcional.

### 4.2 Branding (sin herencia)

```text
Jerusalén (sede)     → logo A, #color1 #color2 #color3
Jerusalén Santa Fe   → logo B, colores propios, slug propio
Concilio ADG         → logo org solo en portal concilio y header F.001
```

---

## 5. Arquitectura de datos

### 5.1 Modelo de tres niveles (Fase 2–3)

```text
                    ┌─────────────────────────┐
                    │   organization          │  ← Concilio (Fase 3)
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
     ┌────────────────┐ ┌──────────────┐
     │ org_unit       │ │ org_unit     │  ← Distrito / presbiterio
     └───────┬────────┘ └──────┬───────┘
             ▼                 ▼
     ┌──────────────────────────────────────────────┐
     │ church (tenant operativo — NO eliminar)       │
     │  parent_church_id → sede (Fase 2)             │
     │  organization_id → concilio (Fase 3)          │
     └──────────────────────────────────────────────┘
```

### 5.2 Extensión `public.church` (Fase 1 + campos Fase 2–3)

```sql
-- Identidad
short_name        text
legal_name        text
slug              text NOT NULL UNIQUE   -- obligatorio Fase 1

-- Contacto
address_line1     text
address_line2     text
city              text
state_province    text
country_code      char(2) DEFAULT 'DO'
postal_code       text
phone             text
email             text
website_url       text

-- Branding (sin herencia)
logo_url          text
primary_color     char(7) NOT NULL DEFAULT '#5B21B6'
  CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$')
secondary_color   char(7) NOT NULL DEFAULT '#4C1D95'
  CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$')
accent_color      char(7) NOT NULL DEFAULT '#1E0A4C'
  CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$')

-- Oficial / reportes
external_code     text          -- ej. IF-042 (F.001)
presbytery_name   text          -- presbiterio

-- Operativo
default_locale    text DEFAULT 'es'
updated_at        timestamptz
updated_by_profile_id uuid REFERENCES profiles(id)

-- Fase 2
parent_church_id  integer REFERENCES church(id)
church_kind       text NOT NULL DEFAULT 'standalone'
  CHECK (church_kind IN ('standalone', 'headquarters', 'campus'))

-- Fase 3
organization_id   integer REFERENCES organization(id)
org_unit_id       integer REFERENCES org_unit(id)
```

### 5.3 Tablas nuevas (Fase 3)

**`organization`**

```sql
id, name, slug UNIQUE, logo_url,
primary_color, secondary_color, accent_color,
report_rules jsonb,   -- reglas F.001 / CEAD configurables
created_at, updated_at
```

**`org_unit`**

```sql
id, organization_id, parent_unit_id, name, code, created_at
```

**`org_membership`**

```sql
id, organization_id, auth_user_id, org_unit_id nullable,
app_role_key text,   -- council_admin, district_auditor, …
is_active, created_at
```

### 5.4 Storage (Fase 1)

```text
Bucket: church-assets (privado)
Path:   {church_id}/logo.png
        {organization_id}/logo.png   (Fase 3)
```

- Subida vía RPC; `fn_assert_session_church(p_church_id)`.
- Lectura autenticada: signed URL o proxy server-side.
- Sitio público: URL derivada de slug + asset público o signed.

---

## 6. Permisos RBAC

### Fase 1

| permission_key | Descripción |
|----------------|-------------|
| `settings:church:read` | Ver perfil de iglesia |
| `settings:church:write` | Editar perfil, logo, colores, slug |

Seed: Admin (1), Pastor (4) → write; Secretario/Tesorero → read si aplica.

Ruta: `/settings/church` → `settings:church:read`.

### Fase 2

| permission_key | Descripción |
|----------------|-------------|
| `network:churches:read` | Sede consulta sucursales (read-only) |

Solo roles en iglesia `church_kind = headquarters` con este permiso.

### Fase 3

| permission_key | Descripción |
|----------------|-------------|
| `org:churches:read` | Listar iglesias afiliadas |
| `org:reports:read` | Ver reportes / F.001 recibidos |
| `org:reports:aggregate` | Dashboard consolidado |
| `org:churches:provision` | Alta de iglesias (opcional, admin concilio) |

**Sin** `org:churches:write` — concilio solo audita.

Actualizar: `src/lib/auth/permission-keys.ts`, `src/lib/roles/display.ts`, `src/lib/auth/route-permissions.ts`.

---

## 7. RPCs

### Fase 1

| RPC | Descripción |
|-----|-------------|
| `sp_get_church_profile(p_church_id)` | Perfil completo |
| `sp_update_church_profile(p_church_id, p_payload jsonb)` | Update + validación slug/colores + audit |
| `sp_get_public_church_profile(p_slug)` | Público sitio web (SECURITY DEFINER, sin PII) |

Validaciones en update:

- `fn_assert_session_church(p_church_id)`
- `fn_user_has_permission('settings:church:write')`
- Slug: único, formato `[a-z0-9-]+`
- Colores: regex `^#[0-9A-Fa-f]{6}$`
- Logo: actualizar `logo_url` tras upload confirmado

Extender `sp_get_session_context()` (Fase 1, mínimo):

```json
{
  "church_name": "...",
  "church_branding": {
    "short_name": "...",
    "logo_url": "...",
    "primary_color": "#5B21B6",
    "secondary_color": "#4C1D95",
    "accent_color": "#1E0A4C"
  }
}
```

Sincronizar `church_name` en `app_metadata` tras cambio de nombre (patrón `sync-app-metadata.ts`).

### Fase 2

| RPC | Descripción |
|-----|-------------|
| `sp_list_network_churches(p_parent_church_id)` | Sucursales de sede |
| `sp_get_network_church_summary(p_parent_church_id, p_child_church_id)` | Read-only KPIs hijo |
| `sp_get_network_dashboard(p_church_id)` | Consolidado sede |

Guards: caller debe ser headquarters; hijo debe tener `parent_church_id = p_church_id`.

### Fase 3

| RPC | Descripción |
|-----|-------------|
| `sp_get_org_session_context()` | Sesión org (alternativa o extensión session) |
| `sp_list_org_churches(p_org_id, p_unit_id?)` | Directorio iglesias |
| `sp_get_org_dashboard(p_org_id)` | KPIs agregados |
| `sp_submit_concilio_report(p_church_id, p_period, p_payload)` | Iglesia → concilio |
| `sp_list_org_submitted_reports(p_org_id, filters)` | Bandeja auditoría |

---

## 8. Frontend (Next.js)

### Fase 1

| Entrega | Detalle |
|---------|---------|
| `src/app/(app)/settings/church/page.tsx` | Formulario perfil iglesia |
| `src/app/(app)/settings/church/actions.ts` | Server actions → RPC |
| `src/lib/services/church-profile.ts` | Cliente RPC |
| `src/components/settings/church-profile-view.tsx` | UI: identidad, contacto, 3 color pickers, logo upload |
| `ChurchBrandProvider` | Inyecta CSS vars en `<html>` desde sesión |
| `ChurchLogo` | `logo_url` dinámico + fallback Fuente Inagotable |
| i18n | `settings.church.*` en es/en/fr |
| Nav | Entrada en CONFIG_NAV → `/settings/church` |

Mapeo colores → tokens (ejemplo):

```typescript
--brand-primary   ← primary_color
--brand-secondary ← secondary_color
--brand-accent    ← accent_color
--accent          ← derivado de primary para compat legacy
```

### Fase 2

| Entrega | Detalle |
|---------|---------|
| `/network` o `/dashboard/network` | Vista sede: lista sucursales + KPIs |
| Drill-down read-only | Detalle financiero/dashboard hijo sin mutación |

### Fase 3

| Entrega | Detalle |
|---------|---------|
| `src/app/(org)/` | Route group portal concilio |
| Middleware host | `concilio.*` → layout org |
| `(org)/login` | Pantalla inicio org |
| `(org)/dashboard`, `(org)/churches`, `(org)/reports` | Consola auditoría |
| `OrgBrandProvider` | Branding organization |

Reportes F.001: alimentar `meta.presbyterio`, `meta.churchCode`, dirección desde `sp_get_church_profile` — eliminar mocks donde aplique.

---

## 9. Tareas por fase

### FASE 1 — Perfil de iglesia ☐

**Rama:** `feat/church-profile` · **Base:** `main`

**Objetivo:** branding y datos institucionales por tenant; base para F.001 real.

| ID | Tarea | DoD |
|----|-------|-----|
| CP-0 | **Git inicio:** checkout `main`, crear `feat/church-profile` | `git branch --show-current` = feat/church-profile |
| CP-1 | Migración SQL: columnas `church`, CHECK colores, slug UNIQUE | Migración aplicada; iglesias existentes backfill slug |
| CP-2 | Permisos `settings:church:read/write` + seed roles | QA permisos roles 1, 4 |
| CP-3 | RPCs get/update/profile público + audit log | RPC probados; slug duplicado rechazado |
| CP-4 | Bucket Storage + RPC/path logo | Upload ≤ tamaño razonable; URL en profile |
| CP-5 | Extender `sp_get_session_context` + `AppSession` | `churchBranding` en sesión |
| CP-6 | UI `/settings/church` + i18n + nav | Form guardado; permiso read/write |
| CP-7 | `ChurchBrandProvider` + `ChurchLogo` dinámico | Shell muestra logo/colores tenant |
| CP-8 | Reportes: churchName + external_code + presbytery desde BD | F.001 mock meta reemplazado donde sea server path |
| CP-9 | **Pruebas cierre:** build, lint, qa:rbac, smoke `/settings/church` | § Workflow Git checklist T1–T6 OK |
| CP-10 | **Git cierre:** commit + push + handoff Fase 2 | Rama en origin; mensaje handoff en chat/PR |

**Backfill slug:** generar desde `name` (`fn_slugify`) + sufijo si colisión; obligar edición en primer login admin opcional (futuro).

**No incluir en Fase 1:** `parent_church_id`, `organization`, portal `(org)`.

---

### FASE 2 — Red sede/hijas ☐

**Rama:** `feat/church-network` · **Base:** `feat/church-profile` (o `main` post-merge Fase 1)

**Prerequisito:** Fase 1 pushed (CP-10 completado).

**Objetivo:** headquarters ve sucursales read-only; finanzas separadas.

| ID | Tarea | DoD |
|----|-------|-----|
| CN-0 | **Git inicio:** crear `feat/church-network` desde base indicada | Rama correcta; Fase 1 presente en historial |
| CN-1 | Migración: `parent_church_id`, `church_kind` + CHECK | campus apunta a headquarters válido |
| CN-2 | Permiso `network:churches:read` + seed sede | Solo headquarters |
| CN-3 | RPCs list/summary/dashboard network | Hijo no lista hermanos ni padre |
| CN-4 | UI network dashboard sede | KPIs agregados + lista sucursales |
| CN-5 | RLS review: hijas aisladas | Intent cross-church falla |
| CN-6 | **Pruebas cierre:** build, lint, smoke red sede/hijas | § Workflow Git T1–T2, T7 OK |
| CN-7 | **Git cierre:** commit + push + handoff Fase 3 | Rama en origin; handoff documentado |

**Regla:** campus **no** hereda logo/colores — cada perfil independiente (decisión §4).

---

### FASE 3 — Organization + portal concilio ☐

**Rama:** `feat/org-enterprise` · **Base:** `feat/church-network` (o `main` post-merge Fases 1–2)

**Prerequisito:** Fase 2 pushed (CN-7 completado).

**Objetivo:** concilio audita; portal `concilio.*` separado.

| ID | Tarea | DoD |
|----|-------|-----|
| OE-0 | **Git inicio:** crear `feat/org-enterprise` desde base indicada | Rama correcta; Fases 1–2 en historial |
| OE-1 | Tablas `organization`, `org_unit`, `org_membership` | FK church.organization_id |
| OE-2 | Permisos `org:*` (read/aggregate only) | Sin write iglesia |
| OE-3 | `sp_get_org_session_context` + org RPCs | Usuario org obtiene scope |
| OE-4 | Route group `(org)` + middleware Host | Dos URLs, un deploy |
| OE-5 | Login + dashboard + churches + reports org | Auditor ve directorio + F.001 |
| OE-6 | Workflow `sp_submit_concilio_report` | Iglesia envía; org lista recibidos |
| OE-7 | `organization.report_rules` → cálculo CEAD/F.001 | Reglas configurables |
| OE-8 | Flutter alineado (mismos RPCs) | Documentado en uploads/ si aplica |
| OE-9 | **Pruebas cierre:** build, lint, smoke portal org | § Workflow Git T1–T2, T8 OK |
| OE-10 | **Git cierre:** commit + push + handoff final | Rama en origin; listo para PR a main |

---

### FASE 4 — Enterprise product (opcional) ☐

- Onboarding iglesias bajo org (`sp_provision_church`)
- Facturación / plan por iglesia
- API externa concilio
- Notificaciones iglesias morosas en envío F.001

---

## 10. Lo que NO cambia

| Principio | Razón |
|-----------|-------|
| `church_id` eje operativo | Miembros, finanzas, RLS actuales |
| `sp_get_session_context()` fuente de verdad | AGENTS.md |
| RPC + guards para mutaciones | Seguridad establecida |
| `organization_id` nullable | Standalone retrocompatible |
| Tema claro/oscuro usuario | Capa distinta de brand iglesia |
| Un miembro = una iglesia | Sin `church_membership` multi |

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Slug obligatorio rompe iglesias existentes | Backfill en migración CP-1 |
| Colores inválidos | CHECK + validación RPC + UI |
| Sede accede a hijo sin permiso | `network:churches:read` + assert parent en RPC |
| Portal org filtra mal | Middleware Host + tests e2e login redirect |
| Flutter desalineado | Mismos RPCs; extender session gradualmente |

---

## 12. Glosario

| Término | Significado |
|---------|-------------|
| **Tenant** | Iglesia operativa (`church_id`) |
| **Organization** | Concilio / denominación (Fase 3) |
| **Headquarters / sede** | `church_kind = headquarters`, `parent_church_id` NULL |
| **Campus / sucursal** | `church_kind = campus`, `parent_church_id` → sede |
| **Concilio (reporte)** | Formato CEAD / F.001 |
| **Concilio (org)** | Entidad `organization` + portal `concilio.*` |
| **Standalone** | Iglesia sin padre ni org — caso actual |

---

## 13. Referencias cruzadas

| Documento | Relación |
|-----------|----------|
| `AGENTS.md` | Multitenant, convenciones |
| `mejoras/AGENT-PROMPT-REPORTES-MODULE.md` | CEAD, F.001, envíos concilio |
| `mejoras/AGENT-PROMPT-RBAC-SPRINT.md` | Patrón permisos y seed |
| `uploads/UI_SPEC.md` | Paleta default `#1E0A4C`, `#4C1D95`, `#5B21B6` |
| `src/lib/reports/templates/concilio/f001-types.ts` | Meta F.001 a alimentar desde BD |

---

## 14. Casos de uso (validación)

### Standalone

```text
Iglesia Fuente Inagotable
  church_kind = standalone, organization_id NULL
  → /settings/church: logo, 3 colores, slug, contacto
  → F.001 usa external_code + presbytery_name desde BD
```

### Red Jerusalén

```text
Jerusalén (headquarters, id=10)
  ├── Jerusalén Santa Fe (campus, id=11, parent=10)
  └── Jerusalén 2 (campus, id=12, parent=10)

Admin sede (id=10): network dashboard + read 11, 12
Admin Santa Fe (id=11): solo 11
Finanzas: libros separados por church_id
Branding: logo/colores distintos por iglesia
```

### Concilio ADG

```text
organization: Concilio Evangélico ADG
  org_unit: Distrito SD Este → iglesias 20, 21
  org_unit: Distrito Santiago → Jerusalén 10, …

Usuario org → concilio.evochurch.app
  → directorio iglesias, F.001 recibidos, KPIs agregados
  → NO edita miembros ni finanzas de iglesia

Iglesia → app.evochurch.app
  → operación normal + submit F.001 mensual
```

---

## 15. Prompts listos por fase (copiar al agente)

### Agente Fase 1

```
@mejoras/AGENT-PROMPT-CHURCH-PROFILE-ENTERPRISE.md

Implementa FASE 1 completa (CP-0 → CP-10).
Rama: feat/church-profile desde main.
Al terminar: pruebas § Workflow Git, commit, push y handoff para Fase 2.
No avances a Fase 2 en esta sesión.
```

### Agente Fase 2

```
@mejoras/AGENT-PROMPT-CHURCH-PROFILE-ENTERPRISE.md

Implementa FASE 2 completa (CN-0 → CN-7).
Rama: feat/church-network desde origin/feat/church-profile
(o main si Fase 1 ya mergeada).
Prerequisito: Fase 1 pushed. Al terminar: pruebas, commit, push, handoff Fase 3.
```

### Agente Fase 3

```
@mejoras/AGENT-PROMPT-CHURCH-PROFILE-ENTERPRISE.md

Implementa FASE 3 completa (OE-0 → OE-10).
Rama: feat/org-enterprise desde origin/feat/church-network
(o main si Fases 1–2 mergeadas).
Prerequisito: Fase 2 pushed. Al terminar: pruebas, commit, push, handoff final.
```

---

*Última actualización: 2026-07-07 — Workflow Git (ramas, pruebas, commit, push, handoff) + decisiones cap. 8 cerradas.*
