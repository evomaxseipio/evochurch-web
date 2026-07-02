# Agent prompt — Sprint 2 (escalabilidad datos financieros)

Copia este bloque al iniciar una sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-SPRINT-2.md`.

**Prerequisito:** Sprint 1 mergeado (`perf/sprint-1-auth-dedup` o equivalente).  
**Rama sugerida:** `perf/sprint-2-data-scale`

---

## Rol

Eres ingeniero senior Next.js 16 + Postgres/Supabase multitenant. Implementa **Sprint 2** del roadmap de performance: dejar de cargar historial financiero completo y paginar en servidor.

## Contexto obligatorio (leer antes de codear)

1. `AGENTS.md`
2. `uploads/CONTEXT.md`
3. `mejoras/PERFORMANCE-ROADMAP.md` — sección Sprint 2
4. Migraciones existentes:
   - `supabase/migrations/20260627120000_finance_ledger_operational_income.sql`
   - `supabase/migrations/20260701120000_tenant_profile_assert_and_rpc_guards.sql`

## Reglas

- **Tenant:** `fn_assert_session_church(p_church_id)` en toda RPC nueva o extendida.
- **Migraciones:** `supabase migration new <nombre>` antes de escribir SQL.
- **Compatibilidad:** Parámetros nuevos en RPCs con `DEFAULT NULL` para no romper callers legacy.
- **Diff mínimo:** No refactorizar Sprint 3 (cache, loading.tsx) en este sprint.
- **No commits** salvo que el usuario lo pida.
- Tras cambios: `npm run build` + probar dashboard y finanzas manualmente.

## Estado actual (baseline — qué hay que cambiar)

| Problema | Ubicación |
|----------|-----------|
| Dashboard carga **todo** income + ledger | `src/lib/services/dashboard.ts` → `fetchIncomeEntries`, `fetchFinanceLedger` |
| Arrays completos al cliente | `DashboardPayload.contributions`, `ledgerEntries` en `src/lib/dashboard/types.ts` |
| Re-agregación en cliente al cambiar periodo | `src/components/dashboard/dashboard-view.tsx` |
| Aportes: fetch completo, paginación `.slice()` | `contributions/page.tsx`, `contributions-list-view.tsx` |
| Transacciones: igual | `transactions/page.tsx`, `transactions-list-view.tsx` |
| Query extra post-RPC | `attachIncomeTypeIds` en `src/lib/services/contributions.ts` |
| Admin scan completo | `pageSize: null` en `src/app/(app)/settings/users/actions.ts` |
| Finanzas miembro: waterfall client API | `member-finances-tab.tsx` → `/api/members/.../finances` |

**RPCs actuales (sin paginación):**
- `sp_get_income_entries(p_church_id, p_fund_id)`
- `sp_get_finance_ledger(p_church_id, p_fund_id, p_date_from, p_date_to)` — fechas opcionales pero sin LIMIT

---

## Tareas del sprint (orden recomendado)

### P0-DATA-1 — RPC dashboard summary

**Migración:** `supabase migration new dashboard_summary_rpc`

**Crear:** `sp_get_dashboard_summary(p_church_id integer, p_months integer DEFAULT 12)`

**Retorno sugerido (JSON o TABLE tipada):**
- `member_stats` — reutilizar campos de `spgetprofiles` stats o subquery
- `funds_summary` — totales por fondo (o delegar a query existente)
- `offering_today` — suma aportes del día
- `catechumen_count`
- `contribution_chart_buckets` — array `{ period_key, label, total }` por mes/semana según UI
- `ledger_chart_buckets` — `{ period_key, label, income, expense }`
- `pending_authorizations` — top 5–10 items (misma forma que `PendingAuthorizationItem`)
- `contribution_monthly_totals` — últimos N meses para sparklines KPI

**App:**
- `src/lib/services/dashboard.ts` — reemplazar `fetchIncomeEntries` + `fetchFinanceLedger` en dashboard
- `src/lib/dashboard/types.ts` — nuevo tipo sin arrays crudos (o opcionales solo dev)
- `src/components/dashboard/dashboard-view.tsx` — recibir puntos pre-agregados; periodo vía `searchParams` + `router.refresh()` o buckets precalculados para week/month/quarter/year
- `src/app/(app)/dashboard/page.tsx` — pasar props acotadas

**DoD:**
- [ ] Dashboard no serializa `contributions[]` ni `ledgerEntries[]` completos al cliente
- [ ] Payload HTML/JSON acotado (< ~50 KB con iglesia mediana de prueba)
- [ ] KPIs y charts coinciden con datos conocidos en staging

---

### P0-DATA-2 — Paginación server-side finanzas

**Migración:** extender RPCs (misma migración o separada)

**`sp_get_income_entries`** — añadir:
- `p_page integer DEFAULT 1`
- `p_page_size integer DEFAULT 25` (cap 100)
- `p_date_from date DEFAULT NULL`
- `p_date_to date DEFAULT NULL`
- Retorno: filas paginadas + `total_count` (segundo result set, JSON wrapper, o RPC companion `sp_count_income_entries`)

**`sp_get_finance_ledger`** — mismos parámetros de paginación + conteo

**App:**
- `src/lib/services/contributions.ts` — `fetchIncomeEntriesPage(...)`
- `src/lib/services/ledger.ts` — `fetchFinanceLedgerPage(...)`
- `src/app/(app)/finances/contributions/page.tsx` — `searchParams`: `page`, `size`, `month`/`from`/`to`, `fund`, `category`
- `src/app/(app)/finances/transactions/page.tsx` — idem
- `src/components/contributions/contributions-list-view.tsx` — paginación navega URL, no `.slice()` como fuente de verdad
- `src/components/transactions/transactions-list-view.tsx` — idem
- KPIs del mes: RPC agregado o stats en respuesta paginada

**DoD:**
- [ ] `?page=2` trae solo `pageSize` filas del servidor (verificar Network/tamaño respuesta)
- [ ] Filtro mes/fecha reduce filas en servidor, no solo en cliente
- [ ] Mutaciones (crear/editar/borrar) siguen funcionando + `revalidatePath`

---

### P1-DATA-3 — Eliminar `attachIncomeTypeIds`

**Migración:** añadir `income_type_id integer` al RETURNS TABLE de `sp_get_income_entries`

**App:**
- `src/lib/contributions/parse.ts` — leer `income_type_id` del RPC
- `src/lib/services/contributions.ts` — eliminar `attachIncomeTypeIds` en read path

**DoD:**
- [ ] Una sola round-trip por listado de aportes
- [ ] Filtros por categoría (tithe/offering/donation) siguen correctos

---

### P1-DATA-4 — Admin lookup targeted

**Migración:** `sp_find_profile_by_email(p_church_id, p_email)` y/o `sp_get_church_auth_user_by_profile(p_church_id, p_profile_id)`

**App:** `src/app/(app)/settings/users/actions.ts`
- Reemplazar `resolveProfileId` con `pageSize: null`
- Reemplazar `fetchChurchAuthUsers` + `.find()` en `getMemberSystemAccessContextAction` / `resetMemberAccessPasswordAction`

**DoD:**
- [ ] Registrar usuario admin no escanea todos los miembros
- [ ] Contexto de acceso de miembro resuelve un usuario, no lista completa

---

### P2-DATA-5 — Member finances sin waterfall (opcional si hay tiempo)

**App:**
- `src/app/(app)/members/profile/page.tsx` — SSR finanzas cuando `tab=finances`
- `src/lib/services/member-finances.ts` — límite filas + ventana fechas
- Reducir o eliminar fetch client en `member-finances-tab.tsx`

**DoD:**
- [ ] Tab finanzas no dispara segundo request si datos ya vienen del servidor
- [ ] Lista acotada (ej. últimos 12 meses o paginación)

---

## Tarea actual

> Sustituir por el ID o alcance.

```
TAREA: Sprint 2 completo (P0-DATA-1 → P1-DATA-4)
```

Orden estricto si se hace incremental:
1. P1-DATA-3 (quick win, misma migración que P0-DATA-2)
2. P0-DATA-2 (finanzas)
3. P0-DATA-1 (dashboard)
4. P1-DATA-4
5. P2-DATA-5

---

## Definition of done (Sprint 2)

- [ ] `npm run build` exitoso
- [ ] Lint limpio en archivos tocados
- [ ] Migraciones SQL con guards tenant
- [ ] Dashboard + contributions + transactions probados manualmente
- [ ] Sin regresión multitenant (usuario solo ve su `church_id`)
- [ ] Documentar en PR/commit qué RPCs cambiaron y params nuevos

---

## Anti-patterns

- Paginación fake: seguir fetch completo + `.slice()` en cliente
- Agregar LIMIT sin `total_count` → paginador roto
- Dashboard summary sin índices en `payment_date` / `movement_date` (ya existen en migraciones recientes)
- Caching (`unstable_cache`) — pertenece a Sprint 3, no aquí

---

## Prompt listo para pegar

```
@mejoras/AGENT-PROMPT-SPRINT-2.md @mejoras/PERFORMANCE-ROADMAP.md @uploads/CONTEXT.md

Implementa Sprint 2 completo (P0-DATA-1 a P1-DATA-4, P2-DATA-5 si cabe).

Orden: P1-DATA-3 → P0-DATA-2 → P0-DATA-1 → P1-DATA-4 → P2-DATA-5.
Migraciones con supabase migration new. Diff mínimo.
Al final: resumen de RPCs nuevos/modificados y cómo probar manualmente.
```
