# Events — Arquitectura y reglas

Módulo de eventos de iglesia: calendario, recurrencia, visibilidad web y vínculo a ministerios.

---

## Propósito

Gestionar actividades de la congregación (cultos, estudios, eventos especiales) con soporte de calendario, series recurrentes y publicación en sitio web.

---

## Entidades

| Entidad | Tabla / concepto |
|---------|------------------|
| Serie de evento | `church_events` (cabecera + reglas recurrencia) |
| Ocurrencia | Expandida en RPC `sp_get_events` |
| Ministerio | FK opcional `ministry_id` |
| Fondo | FK opcional `fund_id` |

---

## Tipos de evento

```typescript
EVENT_TYPES = ["culto", "estudio", "evento"]
```

---

## RPC

| RPC | Uso |
|-----|-----|
| `sp_get_events` | Listado por rango fecha, filtro ministerio |
| `sp_maintain_event` | Crear/actualizar serie |
| `sp_delete_event` | Eliminar |

**Servicio web:** `src/lib/services/events.ts`

---

## Permisos

| Permiso | Acción |
|---------|--------|
| `eventos:read` | Ver calendario |
| `eventos:write` | CRUD global |
| `eventos:write_own` | CRUD solo ministerios donde es líder |
| `eventos:delete` | Eliminar |

ABAC: `canEditEventWith(permissions, profileId, ministryId, leaderProfileIds)`

---

## Recurrencia

```typescript
RecurrenceRule {
  frequency: "weekly" | "monthly"
  interval: number
  byWeekday: number[]
  exceptions?: string[]  // fechas ISO excluidas
}
```

---

## Visibilidad web

| Flag | Efecto |
|------|--------|
| `isWebsiteListed` | Visible en sitio público |
| `isWebsitePromoted` | Destacado en home web |
| `isFeatured` | Destacado en app (requiere `eventos:write` global) |

Límites por iglesia configurables en BD (migración `church_events_website_visibility`).

---

## UI web

- Ruta: `/eventos`
- Componentes: `events-view`, `events-calendar`, `event-form-drawer`
- Cache: `catalogTags.events(churchId)`, revalidate 120s

---

## Relación con Attendance Engine (futuro)

EPIC 03 planifica un motor de asistencia genérico. Los eventos serán la **fuente de sesiones** para registrar asistencia — no duplicar entidades de "culto" separadas.

Ver [DECISION_LOG.md](DECISION_LOG.md) ADR-006 y [../product/PRODUCT_STRATEGY.md](../product/PRODUCT_STRATEGY.md) EPIC 03.

---

## Documentos relacionados

- [MODULES.md](MODULES.md)
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- `src/lib/events/types.ts`
