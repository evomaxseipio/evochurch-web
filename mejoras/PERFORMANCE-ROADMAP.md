# Roadmap de performance — evochurch-web

> Generado a partir de auditoría de performance (Jul 2026).  
> Stack: Next.js 16, React 19, Supabase SSR, Postgres multitenant.

## Resumen ejecutivo

| Área | Estado | Riesgo principal |
|------|--------|------------------|
| Auth por request | 🔴 Crítico | 2–3× `getUser()` + 2× `sp_get_session_context` por navegación |
| Datos financieros | 🔴 Crítico a escala | Historial completo sin límite en dashboard y finanzas |
| Paginación finanzas | 🟠 Alto | Paginación solo en cliente tras fetch completo |
| Caching de lectura | 🟡 Medio | Sin `unstable_cache`; catálogos re-fetch en cada page |
| Client bundle | 🟡 Medio | ~66 client components; shells grandes |
| Streaming UX | 🟡 Medio | Un solo `loading.tsx` |

---

## Mapa de dependencias entre sprints

```
Sprint 1 (Auth) ──► base para medir mejoras reales en TTFB
       │
       ▼
Sprint 2 (Datos) ──► mayor impacto escalabilidad (iglesias grandes)
       │
       ▼
Sprint 3 (Cache + UX) ──► optimiza reads repetitivos y percepción
       │
       ▼
Sprint 4 (Observabilidad) ──► validar que los sprints anteriores funcionan
```

---

## Sprint 1 — Auth y sesión deduplicada

**Objetivo:** Reducir round-trips Supabase en proxy + layout de ~4–5 a ~2 por request.  
**Esfuerzo:** 1–2 días · **Riesgo:** Bajo · **Migraciones SQL:** No (opcional JWT en Sprint 1.3)

### P0-AUTH-1 — Cachear `getVerifiedUser`

**Archivos:**
- `src/lib/supabase/session.ts`

**Tarea:**
- Envolver `getVerifiedUser` con `React.cache()` (mismo patrón que `getSessionUser`).

**Criterio de aceptación:**
- Una sola llamada a `auth.getUser()` por request RSC aunque layout y `getAppSession` la invoquen.
- Build y lint sin errores.

---

### P0-AUTH-2 — Simplificar `(app)/layout.tsx`

**Archivos:**
- `src/app/(app)/layout.tsx`

**Tarea:**
- Eliminar `getVerifiedUser()` independiente.
- Usar solo `getAppSession()` para redirect si no hay sesión de negocio.
- Derivar `userLabel` / `userEmail` desde `AppSession` (fallback a email de sesión).

**Criterio de aceptación:**
- Layout no llama `getVerifiedUser` directamente.
- Redirect a `/login` si `getAppSession()` retorna `null`.
- Redirect a update-password sigue funcionando vía `sessionRequiresPasswordChange(session)`.

---

### P0-AUTH-3 — Fast-path JWT en middleware (password gate)

**Archivos:**
- `src/lib/supabase/middleware.ts`
- `src/lib/auth/fetch-session-password-gate.ts`
- `src/lib/auth/temp-password-flow.ts`
- Revisar sync en `src/app/(auth)/login/actions.ts`

**Tarea:**
- Leer `user.app_metadata.is_temp_password` (o clave ya sincronizada en login) **antes** de `sp_get_session_context`.
- Solo llamar RPC si el flag no está presente o hay inconsistencia.
- Mantener fail-safe: si JWT dice temp password → redirect; si no → skip RPC.

**Criterio de aceptación:**
- Navegación normal (password ya cambiado) no ejecuta `sp_get_session_context` en middleware.
- Usuario con temp password sigue redirigido a `/login/update-password`.
- Flujo login → temp password → dashboard intacto.

---

### P0-AUTH-4 — Unificar cliente en `getActionSession`

**Archivos:**
- `src/lib/auth/app-session.ts`

**Tarea:**
```typescript
// Antes: createClient() × 2
// Después: session = await requireAppSession(); supabase = await createClient(); (una vez)
```
- Opcional: helper `getCachedSupabaseClient = cache(createClient)` si es seguro en el request.

**Criterio de aceptación:**
- Server actions no crean dos instancias redundantes por invocación.

---

### P1-AUTH-5 — Paralelizar auth users en members page

**Archivos:**
- `src/app/(app)/members/page.tsx`

**Tarea:**
- Incluir `fetchChurchAuthUsers` en el `Promise.all` inicial cuando `canManageUsers`.

**Criterio de aceptación:**
- Admin no paga waterfall secuencial tras cargar miembros.

---

## Sprint 2 — Escalabilidad de datos financieros

**Objetivo:** Dejar de cargar historial completo en dashboard y páginas de finanzas.  
**Esfuerzo:** 3–5 días · **Riesgo:** Medio · **Migraciones SQL:** Sí

### P0-DATA-1 — RPC dashboard summary

**Migración:** `supabase/migrations/YYYYMMDDHHMMSS_dashboard_summary_rpc.sql`

**Archivos app:**
- `src/lib/services/dashboard.ts`
- `src/lib/dashboard/types.ts`
- `src/lib/dashboard/aggregate.ts`
- `src/components/dashboard/dashboard-view.tsx`
- `src/app/(app)/dashboard/page.tsx`

**Tarea:**
- Crear `sp_get_dashboard_summary(p_church_id, p_months)` que retorne:
  - KPIs (miembros, fondos, ofrenda hoy, pendientes)
  - Buckets mensuales para charts (contribuciones + ingreso/gasto)
  - Lista acotada de pendientes de autorización (top N)
- Dejar de serializar `contributions[]` y `ledgerEntries[]` completos al cliente.

**Criterio de aceptación:**
- Dashboard carga con payload acotado (< 50 KB típico).
- Cambio de periodo en charts no re-escanea arrays completos en cliente (preferir searchParams + refresh o datos pre-agregados para 3/6/12 meses).

---

### P0-DATA-2 — Paginación server-side en finanzas

**Migración:** extender `sp_get_income_entries`, `sp_get_finance_ledger`

**Archivos:**
- `src/lib/services/contributions.ts`
- `src/lib/services/ledger.ts`
- `src/app/(app)/finances/contributions/page.tsx`
- `src/app/(app)/finances/transactions/page.tsx`
- `src/components/contributions/contributions-list-view.tsx`
- `src/components/transactions/transactions-list-view.tsx`

**Tarea:**
- Añadir `p_page`, `p_page_size`, `p_date_from`, `p_date_to` a RPCs.
- Wire `searchParams` en pages; quitar `.slice()` client-side como fuente de verdad.

**Criterio de aceptación:**
- Página 1 de aportes/transacciones no carga más de `pageSize` filas del servidor.
- KPIs del mes calculados en servidor o RPC agregado.

---

### P1-DATA-3 — Eliminar `attachIncomeTypeIds`

**Migración:** incluir `income_type_id` en `sp_get_income_entries`

**Archivos:**
- `src/lib/services/contributions.ts`
- `src/lib/contributions/parse.ts`

**Tarea:**
- RPC retorna `income_type_id`; eliminar segunda query `.from("income_entries").select(...)`.

---

### P1-DATA-4 — Admin: lookup targeted de perfil

**Archivos:**
- `src/app/(app)/settings/users/actions.ts`
- Nueva migración RPC `sp_find_profile_by_email` o similar

**Tarea:**
- Reemplazar `pageSize: null` en `resolveProfileId`.
- Reemplazar scan completo de auth users por lookup por `profile_id`.

---

### P2-DATA-5 — Member finances sin waterfall

**Archivos:**
- `src/app/(app)/members/profile/page.tsx`
- `src/components/members/member-finances-tab.tsx`
- `src/app/api/members/[profileId]/finances/route.ts`

**Tarea:**
- SSR finanzas cuando `tab=finances`, o parallel route `@finances`.
- Límite de filas / ventana de fechas en query.

---

## Sprint 3 — Cache, bundle y UX

**Objetivo:** Reducir reads repetitivos y mejorar percepción de carga.  
**Esfuerzo:** ~1 semana · **Riesgo:** Bajo–medio

### P2-CACHE-1 — `unstable_cache` para catálogos

**Archivos:**
- `src/lib/services/funds.ts`
- `src/lib/services/contributions.ts` (`fetchIncomeTypes`)
- `src/lib/services/expense-types-catalog.ts`
- `src/lib/services/income-types-catalog.ts`
- `src/lib/services/members.ts` (`fetchMemberRoles`)
- `src/lib/services/scripture-verses.ts`

**Tarea:**
- Cache keyed by `churchId` con tags; invalidar vía `revalidatePath` existente en actions.

---

### P2-UX-1 — `loading.tsx` en rutas pesadas

**Archivos nuevos:**
- `src/app/(app)/dashboard/loading.tsx`
- `src/app/(app)/members/loading.tsx`
- `src/app/(app)/finances/contributions/loading.tsx`
- `src/app/(app)/finances/transactions/loading.tsx`

**Tarea:**
- Skeletons alineados con design tokens (`src/styles/design.css`).

---

### P2-BUNDLE-1 — Limpieza de código muerto

**Eliminar o archivar (no importados):**
- `src/components/dashboard/attendance-bar-chart.tsx`
- `src/components/dashboard/giving-line-chart.tsx`
- `src/components/dashboard/upcoming-events.tsx`
- `src/components/dashboard/quick-actions.tsx`
- `src/components/contributions/contributions-analytics-view.tsx`

---

### P2-BUNDLE-2 — Eliminar `react-icons`

**Archivos:**
- `src/components/transactions/transaction-kpi-icons.tsx` → migrar a `src/components/icons.tsx`
- `package.json`

---

### P2-UX-2 — Clock: reducir re-renders

**Archivos:**
- `src/components/shell/clock.tsx`

**Tarea:**
- Actualizar cada minuto en desktop o usar CSS donde aplique; evitar `setInterval` 1s si no es requisito de producto.

---

### P2-ARCH-1 — Dashboard charts como server islands

**Archivos:**
- `src/components/dashboard/dashboard-view.tsx`
- Charts individuales

**Tarea:**
- Evaluar split: KPIs/hero server; toolbar + periodo client mínimo.
- `dynamic(..., { loading: () => ... })` para islas pesadas si hace falta.

---

## Sprint 4 — Observabilidad

**Objetivo:** Medir impacto real post-optimización.  
**Esfuerzo:** 2–3 días

### P3-OBS-1 — Bundle analyzer en CI/local

- `@next/bundle-analyzer` en `next.config.ts`
- Script `npm run analyze`

### P3-OBS-2 — Timing de RPCs en servidor

- Log estructurado (dev) de duración por RPC en `src/lib/services/*`
- No loggear PII

### P3-OBS-3 — Web Vitals

- `reportWebVitals` o integración Vercel Analytics si aplica

### P3-OBS-4 — Postgres EXPLAIN

- `EXPLAIN ANALYZE` en staging para `sp_get_income_entries`, `sp_get_finance_ledger`, `sp_get_session_context` con volumen realista

---

## Métricas objetivo (post Sprint 1 + 2)

| Métrica | Actual (est.) | Objetivo |
|---------|---------------|----------|
| Round-trips Supabase / dashboard | ~10–11 | ≤ 4 |
| `sp_get_session_context` / navegación | 2 | 0–1 |
| Payload dashboard (iglesia mediana) | 200 KB – varios MB | < 50 KB |
| TTFB dashboard (warm) | variable | −30% vs baseline medido |

---

## Archivos clave (referencia rápida)

| Dominio | Path |
|---------|------|
| Proxy / middleware | `src/proxy.ts`, `src/lib/supabase/middleware.ts` |
| Sesión | `src/lib/auth/app-session.ts`, `src/lib/supabase/session.ts` |
| Password gate | `src/lib/auth/fetch-session-password-gate.ts` |
| Dashboard data | `src/lib/services/dashboard.ts` |
| Finanzas read | `src/lib/services/contributions.ts`, `src/lib/services/ledger.ts` |
| Layout app | `src/app/(app)/layout.tsx` |
| Migraciones finanzas | `supabase/migrations/20260627120000_finance_ledger_operational_income.sql` |
| Session RPC | `supabase/migrations/20260629120000_session_context.sql` |

---

## Orden de ejecución recomendado

1. **Ahora:** Sprint 1 completo (`P0-AUTH-1` → `P0-AUTH-4`)
2. **Siguiente:** Sprint 2 `P0-DATA-1` + `P0-DATA-2` (mayor ROI escalabilidad)
3. Sprint 2 resto + Sprint 3 en paralelo según capacidad
4. Sprint 4 al cerrar Sprint 2 para validar
