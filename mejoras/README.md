# Mejoras — evochurch-web

Documentación de mejoras planificadas para que agentes (Cursor, Claude, etc.) las ejecuten con contexto completo.

## Índice

| Documento | Contenido |
|-----------|-----------|
| [PERFORMANCE-ROADMAP.md](./PERFORMANCE-ROADMAP.md) | Roadmap completo de performance (4 sprints) |
| [AGENT-PROMPT-PERFORMANCE.md](./AGENT-PROMPT-PERFORMANCE.md) | Prompt base + reglas para el agente |
| [QA-PROMPT-SPRINT-1.md](./QA-PROMPT-SPRINT-1.md) | QA del Sprint 1 (auth deduplicada) |
| [AGENT-PROMPT-SPRINT-2.md](./AGENT-PROMPT-SPRINT-2.md) | Implementación Sprint 2 (datos financieros) |
| [QA-PROMPT-SPRINT-2.md](./QA-PROMPT-SPRINT-2.md) | QA del Sprint 2 (datos financieros) |

## Cómo usar

1. Abre el chat en **Agent mode**.
2. Adjunta o referencia `@mejoras/AGENT-PROMPT-PERFORMANCE.md` y el sprint concreto de `@mejoras/PERFORMANCE-ROADMAP.md`.
3. Indica el sprint o tarea: *"Ejecuta Sprint 1"* o *"Ejecuta P0-1"*.

## Prioridad actual

**Sprint 1:** deduplicación auth — rama `perf/sprint-1-auth-dedup` (mergeado o listo para merge).

**Sprint 2:** escalabilidad datos financieros — rama `perf/sprint-2-data-scale` (**cerrado**). Ver `AGENT-PROMPT-SPRINT-2.md`, `QA-PROMPT-SPRINT-2.md` y `scripts/qa-sprint2.mjs`.

**Sprint 3:** cache + UX — rama `perf/sprint-3-cache-ux` (**cerrado**).

**Sprint 4:** observabilidad — rama `perf/sprint-4-observability` (**en progreso**). Ver `PERFORMANCE-ROADMAP.md` § Sprint 4.

### Cierre Sprint 4 (Jul 2026)

| Entregable | Estado |
|------------|--------|
| P3-OBS-1 `@next/bundle-analyzer` + `npm run analyze` | ✅ |
| P3-OBS-2 timing RPC en dev (`withRpcTiming`) | ✅ |
| P3-OBS-3 Web Vitals (`web-vitals`, log dev) | ✅ |
| P3-OBS-4 `EXPLAIN ANALYZE` staging (`scripts/explain-critical-rpcs.sql`) | ✅ script |

### Baselines post-Sprint 4 (captura manual)

| Métrica | Cómo medir | Objetivo roadmap |
|---------|------------|------------------|
| Round-trips dashboard | Contar líneas `rpc_timing` al cargar `/dashboard` (dev) | ≤ 4 |
| `sp_get_session_context` / navegación | Idem en cambio de ruta | 0–1 |
| TTFB / LCP | DevTools → logs `web_vital` | −30% vs baseline |
| Payload dashboard | Network tab → document + RSC | < 50 KB |
| RPC Postgres | `scripts/explain-critical-rpcs.sql` en staging | sin seq scans críticos |

| P1-AUTH-5 paralelizar auth users en members | ✅ |

### Cierre Sprint 3 (Jul 2026)

| Entregable | Estado |
|------------|--------|
| P2-CACHE-1 `unstable_cache` catálogos/fondos/roles/versículo | ✅ |
| Invalidación `revalidateTag` en actions finanzas/settings | ✅ |
| P2-UX-1 `loading.tsx` dashboard, contributions, transactions, members | ✅ |
| P2-BUNDLE-1 componentes dashboard/contrib muertos eliminados | ✅ |
| P2-BUNDLE-2 `react-icons` removido | ✅ |
| P2-UX-2 reloj eliminado del topbar | ✅ |
| P2-ARCH-1 dashboard server islands | ⏭ omitido (opcional) |

### Cierre Sprint 2 (Jul 2026)

| Entregable | Estado |
|------------|--------|
| P0-DATA-1 `sp_get_dashboard_summary` | ✅ |
| P0-DATA-2 paginación `sp_get_income_entries` | ✅ |
| P1-DATA-3 paginación `sp_get_finance_ledger` | ✅ |
| P1-DATA-4 paginación server aportes/transacciones | ✅ |
| P2-DATA-5 admin lookup + finanzas miembro SSR | ✅ |
| Migraciones SQL (3 archivos en `supabase/migrations/`) | ✅ aplicadas en remoto |
| QA automatizado PERF/SEC/DASH | ✅ GO (`node scripts/qa-sprint2.mjs`) |
| Optimización carga `/members` (lazy catalogs + dynamic imports) | ✅ |

**Pendiente manual (no bloqueante):** CRUD E2E browser (CONT/TX/PROF en `QA-PROMPT-SPRINT-2.md`).

## Convenciones del repo

Antes de tocar lógica de producto, auth o datos, leer:

1. `uploads/CONTEXT.md`
2. `AGENTS.md` (raíz del repo)

Multitenant: `church_id` vía `getAppSession()` / `getActionSession()` — no autorizar desde metadata del cliente.
