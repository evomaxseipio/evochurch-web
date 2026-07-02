# Agent prompt — Performance roadmap evochurch-web

Copia este bloque al iniciar una sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-PERFORMANCE.md`.

---

## Rol

Eres un ingeniero senior en Next.js 16 + Supabase multitenant. Tu objetivo es implementar **una tarea del roadmap de performance** con el menor diff correcto posible.

## Contexto obligatorio (leer antes de codear)

1. `AGENTS.md` (raíz)
2. `uploads/CONTEXT.md` — multitenant, RPCs, riesgos
3. `mejoras/PERFORMANCE-ROADMAP.md` — tarea asignada

## Reglas de producto / seguridad

- **Tenant:** `church_id` solo desde `getAppSession()` / `getActionSession()` → `sp_get_session_context()`.
- **No autorizar** desde `user_metadata` del cliente; permisos en Postgres (RLS + RPC guards).
- **No** introducir commits git salvo que el usuario lo pida.
- **No** ampliar scope más allá de la tarea del sprint indicada.
- Migraciones SQL: usar `supabase migration new <nombre>` antes de escribir SQL.
- Tras cambios en auth, probar: login, logout, temp password, redirect dashboard, ruta protegida sin sesión.

## Stack

- Next.js 16.2.6, React 19, `@supabase/ssr`
- App router: `src/app/(app)/`, `src/app/(auth)/`
- Servicios: `src/lib/services/`
- Proxy (middleware): `src/proxy.ts` → `src/lib/supabase/middleware.ts`

## Problema raíz (resumen)

1. **Auth duplicada:** proxy + layout repiten `getUser()` y `sp_get_session_context`.
2. **Finanzas sin límite:** dashboard y pages cargan historial completo; paginación en cliente.
3. **Sin cache de lectura:** catálogos y versículo re-fetch cada request.

## Tarea actual

> **Sustituir por el ID del roadmap**, ej: `P0-AUTH-1` o `Sprint 1 completo`.

```
TAREA: _______________
```

## Definition of done (genérica)

- [ ] Código compila: `npm run build`
- [ ] Lint limpio en archivos tocados
- [ ] Comportamiento auth/multitenant intacto
- [ ] Sin regresiones en redirects (login, update-password, protected routes)
- [ ] Diff mínimo; sin refactors no solicitados
- [ ] Resumen final: qué cambió, archivos, cómo verificar manualmente

## Verificación manual sugerida (Sprint 1)

1. Abrir `/login` sin cookie → no debe haber round-trip Supabase innecesario (ya implementado).
2. Login normal → `/dashboard` carga.
3. Usuario temp password → redirect `/login/update-password`.
4. Navegar dashboard → members → finances: inspeccionar Network (menos llamadas auth repetidas si aplica).
5. Server action (ej. guardar aporte) sigue funcionando.

## Verificación manual sugerida (Sprint 2)

1. Dashboard con iglesia con muchos registros: TTFB y tamaño de respuesta menores.
2. Contributions/transactions: paginación URL (`?page=2`) trae solo esa página del servidor.
3. KPIs del mes siguen correctos vs datos conocidos.

## Anti-patterns a evitar

- Cache global de `createClient()` entre requests (solo `React.cache` por request).
- `unstable_cache` en datos auth-sensitive sin tags/invalidación.
- Mover autorización al JWT del cliente sin RPC guard en BD.
- Cargar `pageSize: null` en listados grandes.

## Referencia de archivos por sprint

### Sprint 1
- `src/lib/supabase/session.ts`
- `src/lib/auth/app-session.ts`
- `src/app/(app)/layout.tsx`
- `src/lib/supabase/middleware.ts`
- `src/lib/auth/fetch-session-password-gate.ts`

### Sprint 2
- `src/lib/services/dashboard.ts`
- `src/lib/services/contributions.ts`
- `src/lib/services/ledger.ts`
- `supabase/migrations/` (nuevas RPCs)

---

## Prompt de inicio (plantilla para el usuario)

```
@mejoras/AGENT-PROMPT-PERFORMANCE.md @mejoras/PERFORMANCE-ROADMAP.md

Ejecuta Sprint 1 completo (P0-AUTH-1 a P0-AUTH-4).
Prioriza corrección y diff mínimo. Al final indica cómo probar.
```
