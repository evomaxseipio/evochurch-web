# evochurch-web — guía para agentes

Repo **Next.js** (consola web). App Flutter: `github.com/evomaxseipio/evochurch`.

Antes de cambiar lógica de producto, auth o datos, lee en este orden:

1. **[uploads/CONTEXT.md](uploads/CONTEXT.md)** — estado de migración Flutter (Riverpod), módulos tocables vs legacy, riesgos (members), RPCs Supabase, diseño M3.
2. **[uploads/CLAUDE.md](uploads/CLAUDE.md)** — comandos Flutter, estructura por features, reglas de estado (`authProvider`, `churchId`), rutas GoRouter, integración Supabase.
3. **[uploads/UI_SPEC.md](uploads/UI_SPEC.md)** — especificación UI (producto, tokens, layout).

## Multitenant

- **`church_id`** es el eje del tenant. En Next.js la fuente de verdad es **`sp_get_session_context()`** (BD vía `auth.uid()`), expuesta como **`getAppSession()`** / **`getActionSession()`** en `src/lib/auth/app-session.ts`.
- No usar metadata del cliente para autorizar: las RPC sensibles llaman **`fn_assert_session_church(p_church_id)`** y **`fn_assert_session_profile(p_profile_id)`**.
- **`app_metadata`** (JWT) se sincroniza desde BD (triggers en `auth_users` / `membership` + opcional `SUPABASE_SERVICE_ROLE_KEY` en login). Solo caché de lectura; permisos reales en Postgres.
- Backend: Postgres + Supabase Auth + RLS; Flutter debe usar el mismo RPC `sp_get_session_context` tras login.

## Contenido de *este* repositorio

| Carpeta / raíz | Qué es |
|----------------|--------|
| **`src/`**, `package.json` | App **Next.js 16 + TypeScript + Supabase** (SaaS web) |
| **`mockup/`** | Prototipo HTML/React con datos ficticios (`EvoChurch.html`) — solo referencia visual |
| **`uploads/`** | Contexto Flutter, UI spec, guías para agentes |
| Flutter (Dart) | Puede vivir en otro clon; no está versionado aquí |

## Convenciones del producto (resumen)

- Features nuevos (Flutter): `data` → `domain` → `providers` → `presentation` con `HookConsumerWidget`.
- No introducir Freezed, `riverpod_generator`, ni `Provider.of` para auth/members.
- Paleta: `#1E0A4C`, `#4C1D95`, `#5B21B6`; breakpoint móvil `< 800px`.

## App Next.js (raíz del repo)

Consola web SaaS: **Next.js + TypeScript + Tailwind + `@supabase/ssr`**.

| Ruta | Uso |
|------|-----|
| `src/lib/supabase/` | Cliente browser, servidor, admin (service role) y middleware |
| `src/lib/auth/app-session.ts` | Sesión multitenant: `getAppSession`, `getActionSession`, permisos |
| `src/lib/tenant.ts` | Helpers legacy JWT (`app_metadata` primero) |
| `src/lib/services/` | RPC por dominio (`members.ts` → `spgetprofiles`) |
| `src/app/(auth)/` | Login |
| `src/app/(app)/` | Dashboard, miembros, finanzas (shell) |

Comandos: `npm install && npm run dev`. Variables: `.env.example` → `.env.local`.

Misma fuente de verdad Supabase que Flutter: RLS + RPC en `uploads/CONTEXT.md`.
