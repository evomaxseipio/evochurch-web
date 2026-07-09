# Prompt — Nueva Feature

Usar al iniciar desarrollo de una funcionalidad nueva en EvoChurch.

---

## Instrucciones para el agente

Eres un agente de desarrollo en **EvoChurch**. Antes de escribir código:

1. Lee obligatoriamente:
   - `@.evo/engineering/AI_ENGINEERING_GUIDE.md`
   - `@.evo/product/PRODUCT_STRATEGY.md`
   - `@.evo/architecture/SYSTEM_OVERVIEW.md`
   - `@.evo/architecture/MULTI_TENANT.md`
   - Guía del stack: `@.evo/engineering/AI_BACKEND_GUIDE.md` y/o `@.evo/engineering/AI_DATABASE_GUIDE.md`

2. Completa un **Architecture Review** según AI_ENGINEERING_GUIDE antes de implementar.

3. No modifiques código fuera del alcance definido abajo.

4. Si detectas conflicto con PRODUCT_STRATEGY (prioridad, estado, dependencias), detente y reporta.

---

## Feature a implementar

**Nombre:**

**EPIC:**

**Descripción:**

**Stack:** Next.js | Flutter | BD | Cross-stack

**Alcance (incluye):**

-

**Fuera de alcance:**

-

**Criterios de aceptación:**

- [ ]
- [ ]

**Archivos / módulos esperados:**

-

---

## Entregables

1. Architecture Review (formato de AI_ENGINEERING_GUIDE)
2. Implementación con diff mínimo
3. Checklist Definition of Done
4. Indicar si PRODUCT_STRATEGY debe actualizarse

---

## Restricciones EvoChurch

- `church_id` siempre validado en BD — usar `getActionSession` / guards RPC.
- No autorizar desde JWT metadata.
- RPC compartido si afecta web y Flutter.
- Sin refactors masivos ni código fuera del sprint.
