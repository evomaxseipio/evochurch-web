# EvoChurch Development Kit (EDK)

Punto de entrada para desarrolladores y agentes de IA que trabajan en EvoChurch.

Este repositorio contiene **dos clientes** (Next.js web + Flutter) sobre **un solo backend** (Postgres + Supabase Auth + RLS + RPC). La carpeta `.evo/` es la fuente de verdad documental del producto.

---

## Orden obligatorio de lectura

Antes de proponer cambios, leer en este orden:

| # | Documento | Cuándo |
|---|-----------|--------|
| 0 | [engineering/AI_ENGINEERING_GUIDE.md](engineering/AI_ENGINEERING_GUIDE.md) | **Siempre** — estándar de calidad, architecture review, definition of done |
| 1 | [product/PRODUCT_STRATEGY.md](product/PRODUCT_STRATEGY.md) | **Siempre** — visión, EPICs, prioridades, backlog |
| 2 | [architecture/SYSTEM_OVERVIEW.md](architecture/SYSTEM_OVERVIEW.md) | Primera vez en el repo o cambios cross-stack |
| 3 | [architecture/MULTI_TENANT.md](architecture/MULTI_TENANT.md) | Auth, sesión, permisos, datos por iglesia |

**Complemento Flutter (legacy, aún vigente):** [uploads/CONTEXT.md](../uploads/CONTEXT.md), [uploads/CLAUDE.md](../uploads/CLAUDE.md), [uploads/UI_SPEC.md](../uploads/UI_SPEC.md) — se migran gradualmente a `.evo/`.

---

## Guía por tipo de tarea (agentes IA)

Después de la lectura obligatoria (ítems 0–3), **identifica qué vas a hacer** y lee **además** las guías de esta tabla **antes de escribir código**.

| Si el agente va a… | Leer también |
|------------------|--------------|
| Server Actions, APIs, servicios | [engineering/AI_BACKEND_GUIDE.md](engineering/AI_BACKEND_GUIDE.md) |
| RPC, migraciones, RLS | [engineering/AI_DATABASE_GUIDE.md](engineering/AI_DATABASE_GUIDE.md) + [templates/MIGRATION_TEMPLATE.md](templates/MIGRATION_TEMPLATE.md) |
| UI web (páginas, componentes) | [engineering/AI_FRONTEND_GUIDE.md](engineering/AI_FRONTEND_GUIDE.md) + [product/AI_DESIGN_SYSTEM.md](product/AI_DESIGN_SYSTEM.md) |
| Flutter | [engineering/AI_FLUTTER_GUIDE.md](engineering/AI_FLUTTER_GUIDE.md) + [uploads/CONTEXT.md](../uploads/CONTEXT.md) |
| Auth, permisos, datos sensibles | [engineering/AI_SECURITY_GUIDE.md](engineering/AI_SECURITY_GUIDE.md) + [architecture/MULTI_TENANT.md](architecture/MULTI_TENANT.md) |
| Nueva feature / priorización | [product/AI_PRODUCT_GUIDE.md](product/AI_PRODUCT_GUIDE.md) + [product/PRODUCT_ROADMAP.md](product/PRODUCT_ROADMAP.md) |
| UX / pantallas | [product/AI_UX_GUIDE.md](product/AI_UX_GUIDE.md) |
| Reglas de negocio (miembros, finanzas…) | [product/AI_BUSINESS_RULES.md](product/AI_BUSINESS_RULES.md) + [architecture/MODULES.md](architecture/MODULES.md) |
| Primera vez en el repo o cambio cross-stack | [architecture/SYSTEM_OVERVIEW.md](architecture/SYSTEM_OVERVIEW.md) |
| Tocar tablas o contratos RPC | [architecture/DATABASE_SCHEMA.md](architecture/DATABASE_SCHEMA.md) |
| BackOffice / feature nueva (Next.js) | [architecture/PROJECT_ARCHITECTURE_v1.md](architecture/PROJECT_ARCHITECTURE_v1.md) |

**Regla:** Si la tarea cruza varias filas (ej. feature con UI + BD), leer **todas** las guías que apliquen. Si hay duda, priorizar `MULTI_TENANT` y la guía del stack.

**Antes de implementar**, el agente debe poder responder en una línea: *qué guías de apoyo consultó y por qué*.

---

## Estructura de `.evo/`

```
.evo/
├── README.md                 ← estás aquí
├── engineering/              ← estándares técnicos por capa
├── product/                  ← estrategia, UX, reglas de negocio
├── architecture/             ← sistema, módulos, multitenant, ADRs
├── sprints/                  ← planificación por sprint
├── prompts/                  ← prompts listos para agentes IA
└── templates/                ← plantillas de feature, task, sprint, ADR
```

---

## Flujo de trabajo

### Nueva funcionalidad

1. Verificar alineación con [product/PRODUCT_STRATEGY.md](product/PRODUCT_STRATEGY.md).
2. Copiar [templates/FEATURE_TEMPLATE.md](templates/FEATURE_TEMPLATE.md) y completar.
3. Ejecutar architecture review según [engineering/AI_ENGINEERING_GUIDE.md](engineering/AI_ENGINEERING_GUIDE.md).
4. Implementar con el stack correcto (ver [architecture/SYSTEM_OVERVIEW.md](architecture/SYSTEM_OVERVIEW.md)).
5. Registrar decisiones relevantes en [architecture/DECISION_LOG.md](architecture/DECISION_LOG.md).

### Bugfix

1. Usar [prompts/BUGFIX_PROMPT.md](prompts/BUGFIX_PROMPT.md).
2. Cambio mínimo — no refactorizar de paso.
3. Validar multitenant y permisos si toca datos sensibles.

### Sprint

1. Copiar [templates/SPRINT_TEMPLATE.md](templates/SPRINT_TEMPLATE.md) → `sprints/sprint-NN/SPRINT.md`.
2. Desglosar en tareas con [templates/TASK_TEMPLATE.md](templates/TASK_TEMPLATE.md).
3. Alinear tareas con EPICs y prioridades de `PRODUCT_STRATEGY.md`.

---

## Trabajar con agentes IA

1. Entrar por este README → **Guía por tipo de tarea** → leer guías de apoyo según el cambio.
2. Pegar el prompt adecuado desde `prompts/` (feature, bugfix, refactor, review).
3. Referenciar `@.evo/product/PRODUCT_STRATEGY.md` y `@.evo/engineering/AI_ENGINEERING_GUIDE.md`.
4. Indicar módulo y stack (Next.js / Flutter / BD).
5. Exigir architecture review antes de código si el cambio es no trivial.
6. No autorizar cambios fuera del alcance del sprint o tarea activa.

---

## Convenciones generales

- **`church_id`** es el eje del tenant. Fuente de verdad: `sp_get_session_context()` en BD.
- **No autorizar desde JWT del cliente** — permisos reales en Postgres (RLS + RPC guards).
- **RPC sobre queries directas** para lógica de negocio compartida entre web y Flutter.
- **Server Actions** en Next.js para mutaciones; servicios en `src/lib/services/` para RPC.
- **Migraciones** en `supabase/migrations/` — una por cambio, con rollback documentado.
- **Paleta:** `#1E0A4C`, `#4C1D95`, `#5B21B6` · breakpoint móvil `< 800px` (Flutter) / `< 768px` (web).

---

## Estado del EDK

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1 | README, Engineering Guide, Product Strategy, System Overview, Multitenant, DB/Backend guides, templates, prompts | ✅ |
| 2 | Product/UX guides, Design System, Business Rules, Roadmap, Sprint 01 | ✅ |
| 3 | Modules, Database Schema, Decision Log, Flutter/Frontend/Security guides, Migration template | ✅ |

---

## Enlaces rápidos del código

| Área | Ruta |
|------|------|
| Sesión multitenant | `src/lib/auth/app-session.ts` |
| Permisos | `src/lib/auth/permission-keys.ts`, `permissions.ts` |
| Servicios RPC | `src/lib/services/` |
| Server Actions | `src/app/(app)/*/actions.ts` |
| Migraciones | `supabase/migrations/` |
| Estilos web | `src/styles/design.css` |
| Entrada agentes (raíz) | `AGENTS.md` |
