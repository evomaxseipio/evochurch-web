# Agent prompt — Cierre semanal de diezmos (reparto configurable)

Copia este bloque al iniciar una sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-FASE-DESCUENTOS-DIEZMO.md`.

**Origen:** debate producto + MVP plantillas descuento (Jul 2026). Ver [DEBATE-MODULO-DESCUENTOS-DIEZMO.md](./DEBATE-MODULO-DESCUENTOS-DIEZMO.md).

**Prerequisitos (mergeados):**

- Rama `feat/discount-templates` — plantillas de descuento (`discount_template`, `discount_template_line`, `report_discount_link`)
- RPCs existentes: `sp_list_discount_templates`, `sp_maintain_discount_template`, `sp_compute_discount_allocation`
- Settings: `/settings/discount-templates` con permiso `settings:discount_templates:write`
- Reportes: vínculo plantilla → Concilio F.001 (`council_sends`) y toggle de plantillas por reporte
- Exports Concilio / Executive ya operativos (no reimplementar en esta fase)

**Rama sugerida:** `feat/tithe-weekly-allocation`

**Alcance:** consola web Next.js + migración Supabase. Sin Flutter, sin auto-ledger, sin motor genérico multi-esquema (Opción 3).

---

## Rol

Eres ingeniero senior Next.js 16 + Postgres/Supabase multitenant. Implementa **cierre semanal de diezmos**: pantalla de finanzas que calcula el reparto según plantilla activa, muestra desglose + detalle de contribuciones, exporta PDF, y permite **cerrar** la semana (snapshot persistido). Reutiliza infraestructura de descuentos ya mergeada.

## Contexto obligatorio (leer antes de codear)

1. **`.evo/engineering/AI_ENGINEERING_GUIDE.md`** — obligatorio: architecture review, impact analysis, KISS/DRY, definition of done
2. `AGENTS.md`
3. `uploads/CONTEXT.md`
4. Debate cerrado (defaults): [DEBATE-MODULO-DESCUENTOS-DIEZMO.md](./DEBATE-MODULO-DESCUENTOS-DIEZMO.md)
5. Módulo descuentos existente:
   - `src/lib/discounts/` — tipos y parse
   - `src/lib/services/discount-templates.ts` — RPC wrappers
   - `src/app/(app)/settings/discount-templates/` — CRUD plantillas
   - `supabase/migrations/20260709180000_discount_templates_module.sql`
6. Roadmap Fase 2 finanzas: `.evo/product/PRODUCT_ROADMAP.md` (distribución automática del diezmo)

---

## Decisiones de producto MVP (NO negociar en código)

Defaults acordados para implementar (reunión puede sobreescribir después editando el debate doc):

| # | Decisión |
|---|----------|
| 1 | **Opción 1 — Config + reporte semanal** (MVP). Sin movimientos automáticos en ledger. |
| 2 | **Base del monto:** solo contribuciones `category = tithe` (`base_kind = 'tithe'`) del período. No ofrendas ni total ingresos. |
| 3 | **Periodicidad:** semanal **domingo a domingo** (inclusive). Semana ISO o índice domingo–domingo documentado en UI. |
| 4 | **Acción del sistema:** solo **reporte en pantalla + export PDF**. Tesorero mueve fondos manualmente fuera del sistema. |
| 5 | **CEAD / Concilio:** flujos **independientes** del cierre semanal. El 15% concilio del reparto semanal **no reemplaza** la fórmula CEAD mensual ni el F.001 hasta validación contable. |
| 6 | **Plantillas:** reutilizar `discount_template` + `discount_template_line`. Una plantilla activa con `base_kind = 'tithe'` es la fuente de % para el cierre semanal. |
| 7 | **Activación:** al habilitar el módulo (primera vez / sin plantilla tithe activa), **seed** plantilla default **70% Pastor / 15% Concilio / 15% Iglesia** (nombres i18n-friendly, editables después). |
| 8 | **Cierre de semana:** tesorero (o rol con permiso de cierre) marca semana como cerrada → snapshot en `discount_period_run`. Semanas cerradas: solo lectura; reabrir fuera de alcance v1. |
| 9 | **Permisos:** configurar plantillas → `settings:discount_templates:write`. Ver cierre → `finances:tithe_close:read`. Cerrar semana / export → `finances:tithe_close:write` (asignar a rol `treasurer` por defecto en migración). |
| 10 | **i18n:** claves en `es.json`, `en.json`, `fr.json` bajo namespace `finances.titheClose` (y `settings.discountTemplates` donde aplique). |

---

## Reglas técnicas

- **Tenant:** `church_id` + `fn_assert_session_church` en toda RPC nueva o extendida.
- **Migración:** `supabase migration new tithe_weekly_close` (nombre descriptivo).
- **Reutilizar** `sp_compute_discount_allocation` para el cálculo en vivo; el cierre persiste snapshot JSON para auditoría.
- **PostgreSQL first:** UNIQUE `(church_id, period_start)` en `discount_period_run`; estado `open` \| `closed`.
- **No romper** callers de plantillas ni reportes Concilio/CEAD existentes.
- **No commits** salvo que el usuario lo pida.
- Tras cambios: `npm run build` + checklist QA manual.

---

## Modelo de datos

### Reutilizar (ya existe)

```sql
-- discount_template (base_kind = 'tithe' para cierre semanal)
-- discount_template_line (label, percent, sort_order)
-- report_discount_link (opcional; Concilio sigue usando link existente)
```

### Nueva tabla — `discount_period_run`

```sql
discount_period_run (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       integer NOT NULL REFERENCES church(id) ON DELETE CASCADE,
  template_id     uuid NOT NULL REFERENCES discount_template(id),
  period_start    date NOT NULL,          -- domingo inicio (inclusive)
  period_end      date NOT NULL,          -- domingo fin (inclusive)
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed')),
  base_amount     numeric(14, 2) NOT NULL,
  allocation_json jsonb NOT NULL,         -- snapshot: lines[{label, percent, amount, sortOrder}]
  contributions_json jsonb,               -- opcional: resumen ids/montos para auditoría
  closed_at       timestamptz,
  closed_by       uuid REFERENCES auth.users(id),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (church_id, period_start)
)
```

**Reglas:**

- `period_start` / `period_end` siempre domingo–domingo para la iglesia (TZ iglesia o UTC documentado).
- Al **cerrar:** `status = 'closed'`, `closed_at`, `closed_by`, snapshot congelado aunque cambien contribuciones después.
- RLS: mismo patrón tenant que `discount_template`.

### Seed plantilla default (en migración o RPC de activación)

```sql
-- INSERT discount_template: name 'Reparto diezmo dominical', base_kind 'tithe', is_active true
-- INSERT discount_template_line:
--   Pastor 70, Concilio 15, Iglesia local 15  (sort_order 1..3)
-- Solo si la iglesia no tiene ya una plantilla tithe activa
```

---

## RPCs sugeridos

| RPC | Propósito |
|-----|-----------|
| `sp_compute_discount_allocation` | **Existente** — cálculo en vivo por template + rango fechas |
| `sp_list_discount_period_runs` | Listar cierres por iglesia (filtro año, paginado opcional) |
| `sp_get_discount_period_run` | Detalle de una semana (por `period_start` o `id`) |
| `sp_upsert_discount_period_run` | Crear borrador `open` o actualizar notas en semana abierta |
| `sp_close_discount_period_run` | Cerrar semana: validar permiso, snapshot, `status = closed` |
| `sp_seed_default_tithe_template` | Idempotente: crea 70/15/15 si no hay plantilla tithe activa |
| `sp_list_tithe_contributions_for_period` | Detalle filas `income_entries` tithe en rango (para tabla UI) |

**Guards:**

- Lectura cierre: `fn_assert_session_church` + `fn_assert_permission('finances:tithe_close:read')`
- Cerrar / seed: `finances:tithe_close:write` o `settings:discount_templates:write` según acción
- Cerrar semana ya `closed` → error 409

---

## Tareas (orden recomendado)

### TD-SQL-1 — Migración

1. `CREATE TABLE discount_period_run` + índices + RLS
2. Permisos nuevos: `finances:tithe_close:read`, `finances:tithe_close:write` → grant a rol `treasurer` (+ `admin` si aplica)
3. RPCs listados arriba
4. `sp_seed_default_tithe_template(p_church_id)` — llamar desde app al primer acceso a `/finances/tithe-close` si cero plantillas tithe

**DoD SQL:**

- [ ] Migración aplica sin error
- [ ] No dos cierres para el mismo `period_start` por iglesia
- [ ] `sp_compute_discount_allocation` devuelve mismos montos que snapshot al cerrar

---

### TD-APP-1 — Tipos y servicios

| Archivo | Cambio |
|---------|--------|
| `src/lib/discounts/types.ts` | `DiscountPeriodRun`, `TitheCloseSummary`, estados |
| `src/lib/discounts/parse.ts` | Parse RPCs nuevos |
| `src/lib/services/tithe-close.ts` | Wrappers RPC (nuevo archivo) |
| `src/lib/auth/permission-keys.ts` | Claves `finances:tithe_close:*` |
| `src/lib/auth/route-permissions.ts` | Mapeo `/finances/tithe-close` |

---

### TD-UI-1 — Pantalla cierre semanal

Ruta: **`/finances/tithe-close`** (añadir tab en `finances-tabs.tsx`).

| UI | Detalle |
|----|---------|
| Selector semana | Navegación anterior/siguiente; default = semana actual (dom–dom) |
| KPI | Total diezmos semana, estado (abierta/cerrada), fecha cierre |
| Tabla reparto | Líneas plantilla: destino, %, monto (desde allocation) |
| Tabla detalle | Contribuciones tithe del período (fecha, miembro, monto, fondo) |
| Acciones | **Exportar PDF** (siempre si read); **Cerrar semana** (write, confirmación) |
| Vacío | Si sin plantilla: CTA a `/settings/discount-templates` + botón seed default |
| Cerrada | Badge + deshabilitar cerrar; montos del snapshot |

Archivos probables: `src/app/(app)/finances/tithe-close/page.tsx`, `actions.ts`, `src/components/finances/tithe-close-view.tsx`, PDF en `src/lib/reports/export/` o módulo finanzas.

---

### TD-UI-2 — PDF export

- Título: "Cierre semanal de diezmos" + rango fechas + iglesia
- Resumen 70/15/15 (o % configurados) + tabla contribuciones
- Pie: tesorero, generado el, semana cerrada sí/no
- Reutilizar patrones de export CEAD/Concilio (`render*Pdf`, fuentes, i18n)

---

### TD-I18N-1 — Traducciones

Namespaces: `finances.titheClose.*`, reutilizar `settings.discountTemplates` donde overlap.

Claves mínimas: título, tabs, weekLabel, statusOpen, statusClosed, closeWeek, closeConfirm, exportPdf, totalTithes, allocation, contributions, noTemplate, seedDefault, closedReadOnly.

---

## Architecture review (completar antes de codear)

- ¿Plantilla tithe activa única o múltiples? → MVP: usar la plantilla tithe activa más reciente o flag `is_default` si hace falta (preferir una activa; documentar en UI si hay varias).
- ¿`sp_compute_discount_allocation` suma todos los fondos? → Sí, todas las `income_entries` tithe en rango (validar con tesorería).
- ¿Impacto reportes CEAD/Concilio? → Ninguno en v1; links existentes intactos.

## Impact analysis

| Módulo | Impacto |
|--------|---------|
| Finanzas (nueva ruta) | Alto — entrega principal |
| Settings plantillas | Bajo — enlace desde cierre si falta config |
| Reportes CEAD/Concilio | Ninguno |
| Dashboard | Ninguno |
| Flutter (futuro) | Medio — mismos RPCs cuando migren |

---

## Fuera de alcance explícito

- Auto-ledger / transferencias sugeridas entre fondos (Opción 2)
- Motor genérico multi-esquema / multi-categoría (Opción 3)
- Reabrir semana cerrada o editar snapshot post-cierre
- Unificar fórmula CEAD con reparto semanal
- Ofrendas en base del cierre semanal
- Periodicidad mensual adicional
- Historial de cambios de % (auditoría de plantilla)
- Multimoneda
- Bolsa de empleos / marketplace
- Flutter / portal miembro

---

## Entregables del agente

1. Resumen ejecutivo
2. Archivos modificados + migración SQL
3. Impact analysis y riesgos
4. Checklist QA manual
5. Mejoras detectadas NO implementadas (Opción 2/3, CEAD merge)

---

## Definition of done

- [ ] Migración SQL aplicada (tabla + permisos + RPCs)
- [ ] `/finances/tithe-close` accesible con permisos correctos
- [ ] Semana domingo–domingo calcula total tithe y reparto según plantilla
- [ ] Seed 70/15/15 idempotente al activar
- [ ] Cerrar semana persiste snapshot; semana cerrada es solo lectura
- [ ] Export PDF funcional es/en/fr
- [ ] `npm run build` exit 0
- [ ] Sin regresión en `/settings/discount-templates` ni reportes Concilio/CEAD

---

## Verificación manual (checklist QA)

```
[ ] Iglesia sin plantilla tithe → seed crea 70/15/15 Pastor/Concilio/Iglesia
[ ] Editar % en settings → cierre semana abierta refleja nuevos %
[ ] Semana con diezmos RD$ 45,000 → Pastor 31,500 / Concilio 6,750 / Iglesia 6,750
[ ] Tabla detalle lista cada contribución tithe del domingo–domingo
[ ] Cerrar semana → badge cerrada; recargar mantiene snapshot
[ ] Agregar diezmo retroactivo en semana cerrada → montos cerrados NO cambian
[ ] Usuario sin finances:tithe_close:write → no ve botón cerrar
[ ] Usuario sin settings:discount_templates:write → puede ver cierre si tiene read
[ ] Export PDF descarga con totales correctos
[ ] CEAD mensual y Concilio F.001 siguen exportando igual que antes
[ ] i18n: cambiar locale en/es/fr — strings de tithe close traducidos
[ ] npm run build — exit 0
```

---

## Prompt corto (copiar/pegar)

```
@mejoras/AGENT-PROMPT-FASE-DESCUENTOS-DIEZMO.md

Lee primero .evo/engineering/AI_ENGINEERING_GUIDE.md (obligatorio).

Implementa cierre semanal de diezmos en rama feat/tithe-weekly-allocation:

- Reutilizar discount_template; nueva discount_period_run
- Semana domingo–domingo, solo tithe, reporte + PDF, cerrar semana (snapshot)
- Seed default 70/15/15; permisos finances:tithe_close:read/write
- UI /finances/tithe-close; sin auto-ledger ni cambios CEAD/Concilio
- i18n es/en/fr. npm run build al final.
```
