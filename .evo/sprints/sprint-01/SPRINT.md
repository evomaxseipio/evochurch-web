# Sprint 01 — Personas y Dashboard

**Objetivo:** Completar features críticas de gestión de miembros (activo/inactivo) y visualización financiera completa en dashboard.

**EPICs:** 01 — Personas · 06 — Dashboard  
**Estado:** ✅ Cerrado
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
| [TASK-001](TASK-001.md) | Estado Activo/Inactivo — web | EPIC 01 | ✅ |
| [TASK-002](TASK-002.md) | Montos completos — Dashboard KPIs | EPIC 06 | ✅ |
| [TASK-003](TASK-003.md) | Estado Activo/Inactivo — Flutter | EPIC 01 | 📋 P4 Flutter |

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

- [x] TASK-001 completada y validada en web
- [x] TASK-002 completada — dashboard muestra montos reales
- [x] TASK-003 movida al siguiente ciclo Flutter/P4: el cliente Flutter vive fuera de este repositorio
- [x] PRODUCT_STRATEGY actualizado (2026-07-21)
- [x] Build web sin errores (`npm run build`, 2026-07-21)
- [x] Architecture review documentado para cambios no triviales
- [x] Sin regresiones multitenant

## Evidencia de cierre técnico — 2026-07-21

- `npm run build` ✅
- `npm run typecheck` ✅
- `npm run qa:i18n` ✅ (1990 claves × 3 locales)
- Piloto manual de TASK-001/TASK-002 aprobado satisfactoriamente (2026-07-21).

---

## Referencias

- [../../product/PRODUCT_STRATEGY.md](../../product/PRODUCT_STRATEGY.md)
- [../../product/PRODUCT_ROADMAP.md](../../product/PRODUCT_ROADMAP.md)
- [../../architecture/MULTI_TENANT.md](../../architecture/MULTI_TENANT.md)
