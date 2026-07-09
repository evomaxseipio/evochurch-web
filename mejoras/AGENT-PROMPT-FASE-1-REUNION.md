# Agent prompt — Fase 1 (feedback reunión EvoChurch)

Copia este bloque al iniciar una sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-FASE-1-REUNION.md`.

**Origen:** reunión con la iglesia — feedback positivo (intuitivo, sencillo, presencia) + 3 ajustes rápidos de UI sin migraciones SQL.

**Rama sugerida:** `feat/fase-1-reunion-ui`

**Alcance:** solo consola web (`evochurch-web`). Sin Flutter, sin Supabase, sin nuevos módulos.

---

## Rol

Eres ingeniero senior Next.js 16 + TypeScript. Implementa **Fase 1** del backlog post-reunión: montos completos en dashboard, columna fecha en transacciones, estatus simplificado en listado de miembros.

## Contexto obligatorio (leer antes de codear)

1. **`.ai/engineering/AI_ENGINEERING_GUIDE.md`** — obligatorio: architecture review, impact analysis, KISS/DRY, definition of done
2. `AGENTS.md`
3. `uploads/CONTEXT.md` — multitenant vía `getAppSession()` / `getActionSession()`
4. `src/lib/format-currency.ts` — `fmtRD` (completo) vs `fmtRDshort` (K/M)

## Reglas

- **Diff mínimo:** no tocar lógica de auth, RPCs, ni otros módulos fuera del alcance.
- **Sin migraciones SQL** en esta fase.
- **i18n:** reutilizar claves existentes (`common.date`, `members.statusActive`, etc.); no hardcodear español en componentes nuevos.
- **No commits** salvo que el usuario lo pida.
- Tras cambios: `npm run build` y verificación manual de `/dashboard`, `/finances/transactions`, `/members`.

---

## Tareas (orden recomendado)

### F1-DASH-1 — KPIs del dashboard con monto completo

**Problema:** Los KPIs financieros muestran `90.6K` en lugar de `90,639.00` (feedback reunión).

**Cambiar `fmtRDshort` → `fmtRD`** en los **valores principales** de las tarjetas KPI del dashboard (no en ejes de gráficos ni en otros módulos de finanzas).

| Archivo | Qué cambiar |
|---------|-------------|
| `src/lib/dashboard/parse.ts` | En `buildDashboardKpisFromSummary`, KPIs: `kpiFundsBalance`, `kpiContributionsMonth`, `kpiLedgerIncomeMonth`, `kpiLedgerExpenseMonth` — usar `fmtRD` |
| `src/lib/dashboard/aggregate.ts` | En `buildDashboardKpis`, mismos 4 KPIs monetarios — usar `fmtRD` (consistencia con reportes que reutilizan esta función) |

**No cambiar en esta tarea:**
- `src/components/dashboard/income-expense-bar-chart.tsx` — ticks del eje Y pueden seguir compactos
- `src/components/dashboard/contributions-line-chart.tsx` — etiquetas del eje; tooltips ya usan `fmtRD` donde aplica
- KPIs de aportes, transacciones, fondos (`contributions-kpi`, `transactions-kpi`, `funds-list-view`) — fuera de alcance

**DoD:**
- [ ] `/dashboard` muestra p. ej. `RD$ 90,639` (o equivalente locale) en Saldo fondos, Contribuciones mes, Ingresos mes, Transacciones mes
- [ ] Sin regresión visual: tarjetas no se desbordan en móvil `< 800px` (ajustar `font-size` o `word-break` solo si hace falta)
- [ ] `npm run build` exitoso

---

### F1-TX-1 — Columna Fecha en listado de transacciones (desktop)

**Problema:** La tabla desktop de transacciones no muestra la fecha del movimiento; solo aparece en tarjetas móvil vía `LedgerMeta`.

**Implementar:**

| Archivo | Cambio |
|---------|--------|
| `src/components/transactions/transactions-list-view.tsx` | Añadir columna `date` **después de `description`** (o antes de `amount`, según legibilidad) |
| Reutilizar | `formatDate(entry.movementDate, locale, { day: "2-digit", month: "short", year: "numeric" })` — mismo patrón que `LedgerMeta` en `src/components/transactions/transaction-ui.tsx` |
| i18n | Header: `tCommon("date")` (`common.date` → "Fecha") |

**Opcional (solo si mejora UX sin ampliar scope):** en `LedgerMeta`, añadir año cuando la tabla ya lo muestra — no obligatorio.

**DoD:**
- [ ] Tabla desktop en `/finances/transactions` tiene columna Fecha visible
- [ ] Fecha coincide con el formulario de edición (`movementDate`)
- [ ] Vista móvil (cards) sin regresión
- [ ] `npm run build` exitoso

---

### F1-MEM-1 — Estatus en listado: solo Activo / Inactivo

**Problema:** El chip de estatus muestra tres valores (Activo, Visita, Inactivo). La iglesia pidió **Activo / Inactivo** en el listado.

**Decisión de producto (aplicar tal cual):**

| `isActive` | Chip en listado |
|------------|-----------------|
| `true` | Activo (`members.statusActive`) |
| `false` | Inactivo (`members.statusInactive`) |

- **No** mostrar "Visita" en la columna/chip del listado aunque `isMember === false`.
- **Mantener** el filtro "Visitas" en la toolbar (`filter === "visits"` → `isActive && !isMember`) — es categoría de filtro, no etiqueta de estatus.
- **No cambiar** el formulario de perfil (`member-profile-form-ui.tsx`) salvo que el chip del listado comparta lógica; el perfil ya usa pills Activo/Inactivo.

**Archivos probables:**

| Archivo | Cambio |
|---------|--------|
| `src/components/members/member-ui.tsx` | Simplificar `StatusChip`: label y color según solo `isActive` |
| `src/components/members/members-list-view.tsx` | Verificar cards móvil usan `StatusChip` — sin texto "Visita" |

**Estilos sugeridos:**
- Activo → chip `success` (como hoy miembro activo)
- Inactivo → chip neutro / sin clase success (como hoy inactivo)

**DoD:**
- [ ] Listado desktop y móvil: solo "Activo" o "Inactivo"
- [ ] Filtro Visitas sigue funcionando y lista visitas con chip "Activo"
- [ ] Perfil de miembro sin cambios funcionales no solicitados
- [ ] `npm run build` exitoso

---

## Verificación manual (checklist QA)

```
[ ] /dashboard — 4 KPIs monetarios con monto completo (no K/M)
[ ] /finances/transactions — columna Fecha en tabla desktop
[ ] /members — columna Estatus solo Activo/Inactivo
[ ] /members?filter=visits — filtro visitas OK, chips dicen Activo
[ ] npm run build — exit 0
```

---

## Fuera de alcance (Fase 2+)

No implementar en esta sesión:

- Tipo de sangre, módulo laboral, diezmo 70/15/15
- Multi-moneda (USD / tasa cambiaria)
- Asistencia, ministerio de niños, eventos pastorales
- Cambiar `fmtRDshort` en contribuciones, transacciones KPI, fondos

---

## Prompt corto (copiar/pegar)

```
@mejoras/AGENT-PROMPT-FASE-1-REUNION.md

Lee primero .ai/engineering/AI_ENGINEERING_GUIDE.md (obligatorio).

Implementa Fase 1 reunión EvoChurch en rama feat/fase-1-reunion-ui:

1. Dashboard KPIs monetarios: fmtRD en parse.ts y aggregate.ts (no otros módulos).
2. Transacciones: columna Fecha en transactions-list-view.tsx (desktop).
3. Miembros: StatusChip solo Activo/Inactivo; mantener filtro Visitas.

Sin SQL. Diff mínimo. npm run build al final.
```
