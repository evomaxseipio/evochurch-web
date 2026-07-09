# Prompt — Refactor

Usar solo cuando el refactor está **explícitamente autorizado** en sprint o tarea.

---

## Instrucciones para el agente

Realiza el refactor descrito manteniendo **comportamiento idéntico** (sin cambios funcionales).

1. Lee:
   - `@.evo/engineering/AI_ENGINEERING_GUIDE.md`
   - Guía del stack afectado

2. Antes de empezar, lista:
   - Archivos a modificar
   - Comportamiento que debe preservarse
   - Cómo validar que no hay regresión

3. Refactor **incremental** — no big bang.
4. Si el refactor revela bugs, documentarlos pero no fixearlos salvo que estén en alcance.

---

## Refactor solicitado

**Objetivo:**

**Motivación (deuda técnica, legibilidad, etc.):**

**Área:** `src/lib/` | `src/app/` | Flutter `features/` | RPC

**Alcance permitido:**

-

**Prohibido tocar:**

-

**Tests / validación manual:**

-

---

## Entregables

1. Plan de refactor (pasos)
2. Diff con comportamiento preservado
3. Lista de validaciones ejecutadas
4. Mejoras detectadas pero NO implementadas (si las hay)

---

## Restricciones

- Sin cambios de API pública sin autorización.
- Sin migraciones de BD salvo que estén en alcance.
- Sin mezclar bugfixes no relacionados.
