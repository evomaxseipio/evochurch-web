# System Overview — EvoChurch

## Visión del sistema

EvoChurch es el **Sistema Operativo de una Iglesia**: una plataforma SaaS multitenant para administrar miembros, finanzas, ministerios, eventos, comunicación y configuración institucional.

**Audiencia:** pastores, tesoreros y administradores de iglesias en Latinoamérica.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│                        Clientes                              │
├──────────────────────────┬──────────────────────────────────┤
│   Next.js 16 (Web SaaS)  │   Flutter (Web + Móvil)          │
│   evochurch-web          │   github.com/evomaxseipio/evochurch│
│   TypeScript + Tailwind  │   Riverpod + GoRouter + M3         │
└────────────┬─────────────┴──────────────┬───────────────────┘
             │                            │
             │    Supabase Client SDK     │
             └────────────┬───────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    Supabase Platform                           │
├───────────────────────────────────────────────────────────────┤
│  Auth (email/password)  │  PostgREST  │  Storage (logos, etc.) │
└─────────────────────────┬─────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              PostgreSQL (fuente de verdad)                   │
├───────────────────────────────────────────────────────────────┤
│  Tablas tenant-scoped  │  RLS policies  │  RPC (stored procs) │
│  Triggers (audit, sync)│  Migraciones   │  RBAC permissions   │
└───────────────────────────────────────────────────────────────┘
```

---

## Repositorios

| Repo | Stack | Rol |
|------|-------|-----|
| **evochurch-web** (este) | Next.js 16, TypeScript, Tailwind, `@supabase/ssr` | Consola web SaaS — dashboard, miembros, finanzas, settings, reportes |
| **evochurch** (Flutter) | Dart, Riverpod, GoRouter, Material 3 | App móvil/web para operación en campo |
| **Supabase** | Postgres + Auth | Backend compartido — misma BD, mismos RPC, mismas políticas RLS |

---

## Módulos funcionales

| Módulo | Rutas web (`src/app/(app)/`) | Estado |
|--------|------------------------------|--------|
| Dashboard | `/dashboard` | Activo |
| Miembros | `/members`, `/members/profile` | Activo |
| Finanzas | `/finances/*` (fondos, transacciones, contribuciones) | Activo |
| Ministerios | `/ministerios` | Activo |
| Eventos | `/eventos` | Activo |
| Comunicación | `/comunicacion` | Activo |
| Reportes | `/reports` | Activo |
| Red de iglesias | `/network` | Activo (headquarters/campus) |
| Configuración | `/settings/*` (iglesia, usuarios, roles, catálogos) | Activo |
| Auth | `src/app/(auth)/` | Login, cambio contraseña temporal |

Detalle por módulo: ver [MODULES.md](MODULES.md) (pendiente de completar).

---

## Capas — Next.js (evochurch-web)

```
src/
├── app/
│   ├── (auth)/           ← login, flujo contraseña temporal
│   └── (app)/            ← shell autenticado
│       ├── */page.tsx    ← Server Components (lectura)
│       └── */actions.ts  ← Server Actions (mutación)
├── lib/
│   ├── auth/             ← sesión, permisos, gates
│   ├── services/         ← llamadas RPC por dominio
│   ├── members/          ← tipos, parse, filtros
│   ├── reports/          ← generadores y export PDF/XLSX
│   └── supabase/         ← client, server, admin, middleware
├── components/           ← UI reutilizable
└── styles/design.css     ← design tokens web
```

**Flujo de lectura:** `page.tsx` → `getAppSession()` / `requireAppSession()` → `src/lib/services/*` → RPC.

**Flujo de escritura:** UI → `actions.ts` → `getActionSession()` / `getActionSessionWith(perm)` → servicio → RPC → `revalidatePath`.

---

## Capas — Flutter (evochurch)

```
lib/src/features/
├── auth/       ← data → domain → providers → presentation
├── members/    ← migrado a Riverpod (HookConsumerWidget)
├── finances/   ← fondos, transacciones, contribuciones
└── …           ← otros módulos en migración

lib/src/view/         ← LEGACY — no agregar código nuevo
lib/src/view_model/   ← LEGACY — deprecado salvo excepciones
```

Patrón: `data/` (Supabase RPC) → `domain/` (state + copyWith) → `providers/` (StateNotifier) → `presentation/` (HookConsumerWidget).

Ver `uploads/CONTEXT.md` y `uploads/CLAUDE.md` para estado de migración.

---

## Flujo de datos

### Autenticación y sesión

1. Usuario inicia sesión vía Supabase Auth (email/password).
2. Cliente llama `sp_get_session_context()` — resuelve `church_id`, `profile_id`, roles y permisos desde BD vía `auth.uid()`.
3. Next.js: `getAppSession()` en `src/lib/auth/app-session.ts`.
4. Flutter: `authProvider` → `AuthState.churchId` (resuelto en repositorio, no solo JWT).

### Lectura de datos

- **Preferir RPC** con `p_church_id` explícito o resuelto por sesión en BD.
- Servicios web en `src/lib/services/` encapsulan RPC + parseo de respuesta.
- RLS como segunda línea de defensa en tablas expuestas.

### Escritura de datos

- **Server Actions** (web) o **StateNotifier** (Flutter) → servicio/repositorio → RPC.
- RPC sensibles llaman `fn_assert_session_church(p_church_id)` y/o `fn_assert_profile_in_session_church(p_profile_id)`.
- Triggers de auditoría en tablas financieras y operativas críticas.

---

## Tecnologías clave

| Capa | Tecnología |
|------|------------|
| Frontend web | Next.js 16, React Server Components, Server Actions, Tailwind |
| Frontend móvil | Flutter, Riverpod (manual), hooks_riverpod, GoRouter |
| Backend | PostgreSQL 15+, Supabase Auth, PostgREST |
| Auth | Supabase email/password, JWT + `app_metadata` sync (caché) |
| Permisos | RBAC granular (`app_permissions` + `permission_keys`) |
| i18n web | `preferred_locale` en sesión, catálogos ARB |
| i18n Flutter | `app_en.arb` / `app_es.arb` |
| Reportes | Generadores TS → PDF (pdf-lib) / XLSX |
| Migraciones | `supabase/migrations/*.sql` |

---

## Integraciones

| Integración | Uso |
|-------------|-----|
| Supabase Storage | Logos de iglesia, assets de marca |
| Org Portal API | API externa para sedes/red (`src/lib/org/`) |
| Sitio web público | Eventos con visibilidad web (`church_events`) |

---

## Principios arquitectónicos

1. **Un backend, dos clientes** — toda lógica de negocio compartida vive en RPC/BD.
2. **Tenant-first** — `church_id` en cada operación; nunca confiar en el cliente para autorizar.
3. **Sesión desde BD** — `sp_get_session_context()` es la fuente de verdad, no JWT metadata.
4. **Migración incremental** — Flutter en transición MVVM→Riverpod; no revertir módulos migrados.
5. **Cambios mínimos** — respetar patrones existentes por módulo.

---

## Documentos relacionados

- [MULTI_TENANT.md](MULTI_TENANT.md) — sesión, guards, permisos
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — tablas y RPC (pendiente)
- [DECISION_LOG.md](DECISION_LOG.md) — ADRs (pendiente)
- [../engineering/AI_DATABASE_GUIDE.md](../engineering/AI_DATABASE_GUIDE.md)
- [../engineering/AI_BACKEND_GUIDE.md](../engineering/AI_BACKEND_GUIDE.md)
