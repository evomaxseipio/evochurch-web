# Sprint 01 — Personas y Dashboard

**Objetivo:** Completar features críticas de gestión de miembros (activo/inactivo) y visualización financiera completa en dashboard.

**EPICs:** 01 — Personas · 06 — Dashboard  
**Estado:** 🧪 Validación
**Prioridad:** 🔴 Crítica

---

## Objetivos

1. **Estado Activo/Inactivo** — filtrar y gestionar miembros inactivos sin perder historial.
2. **Montos completos en Dashboard** — KPIs financieros con valores reales, no truncados ni placeholder.
3. Mantener multitenant y permisos RBAC en todo cambio.

---

## Tareas

| ID | Tarea | Feature | Estado |
|----|-------|---------|--------|
| [TASK-001](TASK-001.md) | Estado Activo/Inactivo — web | EPIC 01 | 🧪 |
| [TASK-002](TASK-002.md) | Montos completos — Dashboard KPIs | EPIC 06 | 🧪 |
| [TASK-003](TASK-003.md) | Estado Activo/Inactivo — Flutter | EPIC 01 | ➡️ Sprint móvil siguiente |

---

## Alcance

### Dentro del sprint

- Toggle y filtro activo/inactivo en listado de miembros (web).
- Stats cards: Activos / Inactivos clickeables.
- Dashboard: montos financieros completos en stats y gráficos.
- La paridad Flutter se mueve al siguiente sprint móvil: el repositorio Flutter
  no forma parte de este checkout y depende del contrato RPC ya implementado.

### Fuera del sprint

- Timeline del miembro
- Distribución automática del diezmo
- Motor de asistencia (entregado fuera del alcance original; está en validación)
- Tipo de sangre, información profesional

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Doble vía de datos en finanzas miembro (Flutter) | Documentar contrato; no mezclar en este sprint |
| KPIs dashboard con RPC lento | Usar `sp_get_dashboard_summary` + cache |
| Inactivos visibles en contribuciones históricas | BR: inactivo conserva historial, solo oculta de listados activos |

---

## Definition of Done (sprint)

- [ ] TASK-001 validada en iglesia piloto (implementación web lista)
- [ ] TASK-002 validada con datos reales y permisos parciales
- [x] TASK-003 movida al siguiente sprint móvil: requiere el repositorio Flutter
- [x] PRODUCT_STRATEGY actualizado a 🧪 donde corresponde
- [ ] Build web sin errores en entorno de CI
- [ ] Architecture review documentado para cambios no triviales
- [ ] Sin regresiones multitenant

---

## Referencias

- [../../product/PRODUCT_STRATEGY.md](../../product/PRODUCT_STRATEGY.md)
- [../../product/PRODUCT_ROADMAP.md](../../product/PRODUCT_ROADMAP.md)
- [../../architecture/MULTI_TENANT.md](../../architecture/MULTI_TENANT.md)
- [../../../mejoras/QA-ATTENDANCE-P2.md](../../../mejoras/QA-ATTENDANCE-P2.md)
