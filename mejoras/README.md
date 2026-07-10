# Mejoras — evochurch-web

Documentación de mejoras planificadas para que agentes (Cursor, Claude, etc.) las ejecuten con contexto completo.

## Índice

| Documento | Contenido |
|-----------|-----------|
| [PERFORMANCE-ROADMAP.md](./PERFORMANCE-ROADMAP.md) | Roadmap completo de performance (4 sprints) |
| [AGENT-PROMPT-PERFORMANCE.md](./AGENT-PROMPT-PERFORMANCE.md) | Prompt base + reglas para el agente |
| [AGENT-PROMPT-RBAC-SPRINT.md](./AGENT-PROMPT-RBAC-SPRINT.md) | **Sprint RBAC** — roles, rutas, acciones, permisos por iglesia |
| [QA-PROMPT-RBAC-SPRINT.md](./QA-PROMPT-RBAC-SPRINT.md) | QA Sprint RBAC — 100% PASS obligatorio; `node scripts/qa-rbac.mjs` |
| [QA-PROMPT-SPRINT-1.md](./QA-PROMPT-SPRINT-1.md) | QA del Sprint 1 (auth deduplicada) |
| [AGENT-PROMPT-SPRINT-2.md](./AGENT-PROMPT-SPRINT-2.md) | Implementación Sprint 2 (datos financieros) |
| [QA-PROMPT-SPRINT-2.md](./QA-PROMPT-SPRINT-2.md) | QA del Sprint 2 (datos financieros) |
| [AGENT-PROMPT-REPORTES-MODULE.md](./AGENT-PROMPT-REPORTES-MODULE.md) | **Módulo Reportes** — hub + CEAD + directorio + ejecutivo (por sección REP-0…REP-6) |
| [AGENT-PROMPT-I18N-MODULE.md](./AGENT-PROMPT-I18N-MODULE.md) | **Internacionalización** — es/en/fr, next-intl, por sección I18N-0…I18N-QA |
| [AGENT-PROMPT-AUDIT-LOG.md](./AGENT-PROMPT-AUDIT-LOG.md) | **Audit log** — bitácora por iglesia, dashboard + reporte `/reports` |
| [AGENT-PROMPT-FASE-1-REUNION.md](./AGENT-PROMPT-FASE-1-REUNION.md) | **Fase 1 reunión** — dashboard montos completos, fecha transacciones, estatus miembros |
| [AGENT-PROMPT-FASE-2-REUNION.md](./AGENT-PROMPT-FASE-2-REUNION.md) | **Fase 2 reunión** — salud (sangre + alergias), oficios tags, empleo principal |
| [DEBATE-MODULO-DESCUENTOS-DIEZMO.md](./DEBATE-MODULO-DESCUENTOS-DIEZMO.md) | **Debate + MVP** — plantillas descuento vinculadas a reportes |
| [AGENT-PROMPT-FASE-DESCUENTOS-DIEZMO.md](./AGENT-PROMPT-FASE-DESCUENTOS-DIEZMO.md) | **Fase 3 diezmo semanal** — cierre domingo–domingo, PDF, snapshot (`feat/tithe-weekly-allocation`) |

## Cómo usar

1. Abre el chat en **Agent mode**.
2. Implementación: `@mejoras/AGENT-PROMPT-RBAC-SPRINT.md`
3. Tras implementar, QA: `@mejoras/QA-PROMPT-RBAC-SPRINT.md` → `npm run qa:rbac:full`
4. **No cerrar sprint** hasta `qa:rbac:full` exit 0 + ROLE-02 manual

## Prioridad actual

### Cierre MVP consola web (Jul 2026)

| Track | Estado | Pendiente |
|-------|--------|-----------|
| **Fase 3 — Cierre semanal diezmos** | ⏳ PENDING | Ver [AGENT-PROMPT-FASE-DESCUENTOS-DIEZMO.md](./AGENT-PROMPT-FASE-DESCUENTOS-DIEZMO.md); rama `feat/tithe-weekly-allocation` |
| Módulos core (auth, miembros, finanzas, ministerios, settings, reportes) | ✅ | Merge rama `feat/ministerios-fondos` + migraciones SQL |
| Sprint performance 1–3 | ✅ cerrado | — |
| Sprint performance 4 | ⚙️ | Captura manual baselines (ver abajo) |
| Sprint RBAC | ⚙️ implementado | QA formal: `npm run qa:rbac:full` *(abortado — re-ejecutar)* |
| Módulo reportes REP-0…6 | ✅ | Descargas manuales R-04…08; `npm run qa:reports` |
| i18n es/en/fr | ⚙️ ~95% | Auditoría strings + I18N-QA manual |
| Placeholders post-MVP | — | `/eventos`, `/comunicacion`, KPIs mock dashboard |

**Orden recomendado restante:** migraciones ministerios-fondos → `npm run build` → `npm run qa:reports` → QA RBAC → I18N-QA → baselines Sprint 4.

**Sprint RBAC:** configuración basada en roles — rama `feat/rbac-sprint`. Ver [AGENT-PROMPT-RBAC-SPRINT.md](./AGENT-PROMPT-RBAC-SPRINT.md).

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

### Baselines Sprint 4 — captura manual (pendiente)

Ejecutar en **staging** con iglesia mediana (~500 miembros, historial 12 meses):

1. **Round-trips dashboard:** `npm run dev` → cargar `/dashboard` → contar líneas `rpc_timing` en consola (objetivo ≤ 4).
2. **TTFB / LCP:** DevTools → Performance → anotar vs baseline anterior (objetivo −30%).
3. **Payload dashboard:** Network → document + RSC (objetivo < 50 KB).
4. **Postgres:** `psql $DATABASE_URL -f scripts/explain-critical-rpcs.sql` — revisar seq scans.

Registrar resultados en PR o comentario de cierre MVP.

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

1. **`.ai/engineering/AI_ENGINEERING_GUIDE.md`** — estándar obligatorio antes de ejecutar cualquier prompt
2. `uploads/CONTEXT.md`
3. `AGENTS.md` (raíz del repo)

Multitenant: `church_id` vía `getAppSession()` / `getActionSession()` — no autorizar desde metadata del cliente.
