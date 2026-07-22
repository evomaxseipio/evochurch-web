# TASK-002 — Montos completos en Dashboard

**Sprint:** 01  
**Feature:** Montos completos (EPIC 06 — Dashboard)  
**Prioridad:** 🔴  
**Stack:** Next.js + RPC  
**Estimación:** M  
**Estado:** 🧪 Validación

---

## Descripción

Mostrar en el dashboard montos financieros completos y reales — ingresos del período, tendencias y desglose — usando datos del RPC de dashboard, no valores truncados ni mock.

---

## Alcance técnico

### Archivos esperados

- `src/app/(app)/dashboard/page.tsx`
- `src/lib/services/dashboard.ts`
- `src/lib/dashboard/parse.ts`, `aggregate.ts`, `resolve-kpi.ts`
- Componentes de stats y charts del dashboard
- RPC: `sp_get_dashboard_summary` (migración `20260701235300`)

### RPC / migraciones

- Consumir `sp_get_dashboard_summary` con `session.churchId`
- Verificar contrato JSON del RPC vs parsers existentes
- Sin migración salvo bug en RPC

### Permisos

- `dashboard:read` para ver dashboard completo
- Finanzas parciales según permisos granulares (`finances:*:read`)

---

## Reglas de negocio

- Montos respetan moneda/locale de la iglesia (`preferred_locale`, format-currency).
- Usuario sin permisos financieros no ve montos sensibles — ocultar, no mostrar cero engañoso.
- KPIs deben reflejar período actual (mes en curso) salvo indicación contraria.

---

## Restricciones

- Eliminar o aislar datos mock (`src/lib/mock/dashboard-data.ts`) del flujo producción.
- No agregar KPIs de asistencia (motor no existe aún).
- Seguir tokens de [AI_DESIGN_SYSTEM.md](../../product/AI_DESIGN_SYSTEM.md) para stats cards.

---

## Entregables

- [x] Stats grid con montos financieros reales formateados
- [x] Gráfico financiero con datos de `sp_get_dashboard_summary`
- [x] Acceso base protegido por `dashboard:read`
- [ ] Sin mock data en producción

---

## Criterios de aceptación

- [x] Dashboard carga datos financieros reales tras login
- [x] Montos muestran formato moneda correcto (no truncados con "...")
- [ ] Usuario solo `profile:read` no ve KPIs financieros
- [ ] Estado vacío si no hay datos — con mensaje claro, no error
- [ ] Performance aceptable (< 2s carga inicial en conexión normal)

---

## Notas

- Revisar `resolve-kpi.ts` para mapeo de permisos → widgets visibles.
- Chart labels: `src/lib/dashboard/chart-labels.ts`.
- Pendiente para cierre: retirar/aislar mocks no financieros de visitantes y fallback de eventos; validar permisos financieros granulares, estado vacío y baseline < 2 s.
