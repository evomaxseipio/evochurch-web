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

**Sprint 3 (siguiente):** cache de lectura + streaming UX — ver `PERFORMANCE-ROADMAP.md` § Sprint 3.

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
