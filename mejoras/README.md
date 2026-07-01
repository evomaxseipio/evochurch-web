# Mejoras — evochurch-web

Documentación de mejoras planificadas para que agentes (Cursor, Claude, etc.) las ejecuten con contexto completo.

## Índice

| Documento | Contenido |
|-----------|-----------|
| [PERFORMANCE-ROADMAP.md](./PERFORMANCE-ROADMAP.md) | Roadmap completo de performance (4 sprints) |
| [AGENT-PROMPT-PERFORMANCE.md](./AGENT-PROMPT-PERFORMANCE.md) | Prompt base + reglas para el agente |

## Cómo usar

1. Abre el chat en **Agent mode**.
2. Adjunta o referencia `@mejoras/AGENT-PROMPT-PERFORMANCE.md` y el sprint concreto de `@mejoras/PERFORMANCE-ROADMAP.md`.
3. Indica el sprint o tarea: *"Ejecuta Sprint 1"* o *"Ejecuta P0-1"*.

## Prioridad actual

**Ejecutar ahora:** Sprint 1 — deduplicación de auth/sesión (`P0-AUTH`).

Motivo: impacto en **cada navegación**, sin migraciones SQL, diff pequeño y bajo riesgo. Ver detalle en el roadmap.

## Convenciones del repo

Antes de tocar lógica de producto, auth o datos, leer:

1. `uploads/CONTEXT.md`
2. `AGENTS.md` (raíz del repo)

Multitenant: `church_id` vía `getAppSession()` / `getActionSession()` — no autorizar desde metadata del cliente.
