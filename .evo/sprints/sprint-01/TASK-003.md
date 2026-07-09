# TASK-003 — Estado Activo/Inactivo (Flutter)

**Sprint:** 01  
**Feature:** Estado Activo/Inactivo (EPIC 01 — Personas)  
**Prioridad:** 🔴  
**Stack:** Flutter  
**Estimación:** M  
**Estado:** 📋 Backlog (dentro sprint 01)

---

## Descripción

Paridad con web: filtro activo/inactivo en listado de miembros y toggle en mantenimiento de perfil (`MemberMaintance`).

---

## Alcance técnico

### Archivos esperados (repo Flutter)

- `lib/src/features/members/presentation/members/member_list.dart`
- `lib/src/features/members/presentation/members/member_maintance.dart`
- `lib/src/features/members/providers/members_provider.dart`
- `lib/src/features/members/data/members_repository.dart`

### RPC

- `spgetprofiles` con filtro activo/inactivo
- `spupdateprofiles` con `p_is_active`

### Permisos

- Mismo modelo que web — validado en RPC, no solo UI.

---

## Restricciones

- Usar `authProvider` para `churchId` — no `AuthServices()`.
- `HookConsumerWidget` — no `MembersViewModel`.
- Ver riesgos members en `uploads/CONTEXT.md`.

---

## Entregables

- [ ] Filtros Activos/Inactivos en `MemberList`
- [ ] Toggle `isActive` en `MemberMaintance` persiste vía `updateMember`
- [ ] Paridad visual con UI_SPEC (chips, stats cards)

---

## Criterios de aceptación

- [ ] Mismo comportamiento que TASK-001 en web
- [ ] `selectMember` + navegación con `extra` preservada
- [ ] Sin regresión en MembershipPage / MemberFinances

---

## Dependencia

- TASK-001 validada en web y contrato RPC estable.

---

## Notas

- Si el sprint se cierra sin esta tarea, mover a sprint 02 y actualizar PRODUCT_STRATEGY.
