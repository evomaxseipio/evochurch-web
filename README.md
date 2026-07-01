# evochurch-web

Consola SaaS **Next.js 16 + TypeScript + Supabase** (multitenant por `church_id`).

Repositorio hermano de la app Flutter: **[evochurch](https://github.com/evomaxseipio/evochurch)**. Comparten el mismo backend Supabase (RPCs, RLS, auth).

## Requisitos

- Node 20+
- Proyecto Supabase (mismo que la app Flutter)

## Configuración

```bash
cp .env.example .env.local   # o usa el .env.local ya generado
npm install
npm run dev
```

Proyecto Supabase: `bbvbivhiifhhcurqdcyg`. Realtime limitado a **2 eventos/seg** (igual que Flutter `RealtimeClientOptions`).

Abre [http://localhost:3000](http://localhost:3000). La raíz redirige a `/login` o `/dashboard`.

## Arquitectura (KISS)

```
src/
├── app/
│   ├── (auth)/login/          # Login + server actions
│   ├── (app)/                 # Shell autenticado
│   │   ├── dashboard/
│   │   ├── members/           # RPC spgetprofiles
│   │   └── finances/          # placeholder
│   └── auth/callback/         # OAuth / PKCE
├── lib/
│   ├── supabase/              # client, server, admin, middleware
│   ├── auth/app-session.ts    # Sesión multitenant (sp_get_session_context)
│   ├── tenant.ts              # Helpers JWT app_metadata (caché)
│   └── services/              # RPC por dominio
└── components/
    └── shell/                 # Sidebar, Topbar
```

- **Tenant (SaaS):** `getAppSession()` / `getActionSession()` resuelven `church_id`, rol y permisos en BD vía `sp_get_session_context()` — no confiar en metadata del cliente. RPCs sensibles usan `fn_assert_session_church`.
- **JWT:** `app_metadata` se sincroniza desde BD (triggers + login). Opcional: `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.
- **Auth:** `@supabase/ssr` + middleware que refresca sesión y protege rutas de app.
- **Datos:** mismos RPC que Flutter; ver `uploads/CONTEXT.md`.

## Scripts

| Comando        | Descripción        |
|----------------|--------------------|
| `npm run dev`  | Desarrollo         |
| `npm run build`| Build producción   |
| `npm run lint` | ESLint             |

## Prototipo HTML

Referencia visual en **[`mockup/`](mockup/)** (`EvoChurch.html`, `*.jsx`, datos ficticios). Ver `mockup/README.md`.
