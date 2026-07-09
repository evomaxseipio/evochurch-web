# TASK-001 — Estado Activo/Inactivo (Web)

**Sprint:** 01  
**Feature:** Estado Activo/Inactivo (EPIC 01 — Personas)  
**Prioridad:** 🔴  
**Stack:** Next.js + BD (si RPC requiere ajuste)  
**Estimación:** M  
**Estado:** 🚧 En Desarrollo

---

## Descripción

Permitir marcar miembros como activos o inactivos, filtrar el listado por estado, y reflejar el toggle en el formulario de perfil. Un miembro inactivo conserva historial financiero y de membresía.

---

## Alcance técnico

### Archivos esperados

- `src/app/(app)/members/page.tsx` — stats cards Activos/Inactivos
- `src/lib/members/filters.ts` — filtros `active` / `inactive` (ya existe)
- `src/lib/services/members.ts` — `spgetprofiles` con `p_filter`
- `src/app/(app)/members/actions.ts` — persistir `is_active` en update
- Componentes de perfil / formulario miembro — toggle Activo/Inactivo

### RPC / migraciones

- Verificar que `spgetprofiles` soporta `p_filter: 'active' | 'inactive'`
- Verificar que `spupdateprofiles` persiste `p_is_active`
- Migración solo si falta soporte en RPC

### Permisos

- Lectura: `members:read`
- Edición estado: `members:write`

---

## Reglas de negocio

- BR: `is_active = false` → excluido de listados operativos por defecto, no de historial.
- Filtros stats: `active`, `inactive` clickeables como en UI_SPEC.
- Chip visual distinto para inactivos (muted/gris).

---

## Restricciones

- No implementar eliminación lógica distinta de `is_active`.
- No tocar módulo Flutter en esta tarea (ver TASK-003).
- Seguir [AI_BACKEND_GUIDE.md](../../engineering/AI_BACKEND_GUIDE.md).

---

## Entregables

- [ ] Filtros Activos/Inactivos funcionales en listado web
- [ ] Toggle en formulario de perfil persiste vía Server Action
- [ ] Stats cards muestran conteos correctos
- [ ] Prueba manual: activar/desactivar miembro y verificar listado

---

## Criterios de aceptación

- [ ] Usuario con `members:read` ve filtros Activos/Inactivos
- [ ] Usuario con `members:write` puede cambiar estado desde perfil
- [ ] Miembro inactivo no aparece en filtro "Activos" pero sí en "Inactivos" y "Todos"
- [ ] Contribuciones históricas del miembro inactivo siguen visibles en tab Finanzas
- [ ] Sin fuga cross-tenant

---

## Notas

- `memberStats()` en `filters.ts` ya calcula `active`/`inactive` — reutilizar.
- Alinear chips con [AI_DESIGN_SYSTEM.md](../../product/AI_DESIGN_SYSTEM.md).
