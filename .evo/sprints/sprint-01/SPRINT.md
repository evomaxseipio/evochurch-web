# Sprint 01 — Personas y Dashboard

**Objetivo:** Completar features críticas de gestión de miembros (activo/inactivo) y visualización financiera completa en dashboard.

**EPICs:** 01 — Personas · 06 — Dashboard  
**Estado:** 🚧 En curso  
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
| [TASK-001](TASK-001.md) | Estado Activo/Inactivo — web | EPIC 01 | 🚧 |
| [TASK-002](TASK-002.md) | Montos completos — Dashboard KPIs | EPIC 06 | 🚧 |
| [TASK-003](TASK-003.md) | Estado Activo/Inactivo — Flutter | EPIC 01 | 📋 |

---

## Alcance

### Dentro del sprint

- Toggle y filtro activo/inactivo en listado de miembros (web).
- Stats cards: Activos / Inactivos clickeables.
- Dashboard: montos financieros completos en stats y gráficos.
- Alineación Flutter del filtro activo/inactivo (si tiempo permite).

### Fuera del sprint

- Timeline del miembro
- Distribución automática del diezmo
- Motor de asistencia
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

- [ ] TASK-001 completada y validada en web
- [ ] TASK-002 completada — dashboard muestra montos reales
- [ ] TASK-003 completada o movida a sprint 02 con justificación
- [ ] PRODUCT_STRATEGY actualizado (estados ✅ o 🧪)
- [ ] Build web sin errores
- [ ] Architecture review documentado para cambios no triviales
- [ ] Sin regresiones multitenant

---

## Referencias

- [../../product/PRODUCT_STRATEGY.md](../../product/PRODUCT_STRATEGY.md)
- [../../product/PRODUCT_ROADMAP.md](../../product/PRODUCT_ROADMAP.md)
- [../../architecture/MULTI_TENANT.md](../../architecture/MULTI_TENANT.md)
