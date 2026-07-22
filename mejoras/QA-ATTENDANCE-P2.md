# QA — P2 Motor de asistencia + P2.x Categorías CRUD + P3 Asistencia de niños

**Rama:** integrado en `main`
**Fecha:** 2026-07-21
**Estado:** 🧪 QA automatizado staging PASS; piloto manual pendiente

## Prerrequisitos

- [x] Migraciones base y `20260720120000_attendance_aggregate_mode` verificadas por contrato RPC en staging
- [x] Usuario QA admin con `attendance:read` + `attendance:write`
- [x] Ministerios reales de casa, discipulado y niños disponibles en staging

## A — Categorías CRUD (P2.x)

| # | Caso | Resultado |
|---|------|-----------|
| A1 | Abrir `/settings/ministry-categories` → ver seeds (Discipulado, Casas, **Célula**, Niños, Adoración, Otro) | ☐ |
| A2 | Editar nombre de una categoría de sistema → se refleja en formulario de ministerio | ☐ |
| A3 | Crear categoría custom → aparece en select de `/ministerios` | ☐ |
| A4 | Intentar borrar categoría **en uso** → error; sistema (`is_system`) no se borra | ☐ |
| A5 | Abrir `/ministerios` → editar → campo **Categoría** desde BD (incl. Célula) | ☐ |
| A6 | Asignar **Casas fuente** / **Célula** / **Discipulado** según tipo | ☐ |
| A7 | Filtro de categoría en listado muestra solo ese grupo | ☐ |
| A8 | Chip/badge de categoría visible en tarjeta o tabla | ☐ |

## B — Sesiones de asistencia (P2)

| # | Caso | Resultado |
|---|------|-----------|
| B1 | Menú **Asistencia** visible con permiso | ✅ E2E |
| B2 | Preset **Sesión de casa** abre drawer con tipo `house_group` | ✅ E2E |
| B3 | Preset **Sesión de estudio** abre con tipo `bible_study` | ☐ |
| B4 | Picker prioriza codes (casa→`house_group`+`cell_group`; estudio→`discipleship`); si no hay, muestra todos activos | ☐ |
| B5 | Crear sesión sin ministerio (tipo casa/estudio) → error / bloqueo | ✅ RPC |
| B6 | Crear sesión OK → redirige al checklist | ✅ agregado E2E; tipos RPC |

## C — Checklist / roster

| # | Caso | Resultado |
|---|------|-----------|
| C1 | Checklist carga el roster del `ministry_id` seleccionado | ✅ E2E con ministerio real |
| C2 | Ministerio sin roster → mensaje vacío claro | ☐ |
| C3 | Marcar presente / ausente / tarde en ≥3 personas → Guardar | ✅ E2E |
| C4 | Reabrir sesión → estados persistidos | ✅ E2E |
| C5 | “Todos presentes” + guardar funciona | ✅ E2E |
| C6 | Editar sesión (fecha/título) desde checklist | ☐ |
| C7 | Eliminar sesión → desaparece del listado | ✅ E2E |

## D — Asistencia de niños (P3)

| # | Caso | Resultado |
|---|------|-----------|
| D1 | Preset **Sesión de niños** visible en el hub | ✅ E2E |
| D2 | No permite crear una sesión de niños sin seleccionar un ministerio | ✅ contrato común RPC |
| D3 | Crear sesión para un ministerio de niños | ✅ RPC staging |
| D4 | El checklist muestra solo perfiles infantiles (`is_child = true`), nunca adultos o líderes | ✅ unit test |
| D5 | Ministerio infantil sin niños registrados muestra un estado vacío claro | ☐ |
| D6 | Marcar presente / ausente / tarde, guardar y reabrir preserva los estados | ☐ |
| D7 | Una sesión de casa o estudio sigue mostrando el roster adulto habitual | ☐ |

## E — Permisos / filtro

| # | Caso | Resultado |
|---|------|-----------|
| E1 | Filtro por tipo en listado (casa / estudio / culto / niños) | ☐ |
| E2 | Usuario solo `attendance:read` ve listado pero no crear/editar | ☐ |
| E3 | Usuario sin `attendance:read` no entra a `/attendance` | ✅ RPC + E2E |

## F — Regresión corta

| # | Caso | Resultado |
|---|------|-----------|
| F1 | `/ministerios` CRUD (crear/editar/borrar) sigue OK | ☐ |
| F2 | `/eventos` abre normal | ☐ |
| F3 | `npm run build` exit 0 | ✅ 2026-07-21 |

## G — Modo agregado (P3.x)

| # | Caso | Resultado |
|---|------|-----------|
| G1 | Crear sesión agregada con conceptos dinámicos | ✅ RPC + E2E |
| G2 | Mostrar detalle y total calculado | ✅ total 18 RPC; total 16 E2E |
| G3 | Rechazar agregado sin conceptos | ✅ RPC |
| G4 | Rechazar records individuales en agregado | ✅ RPC |
| G5 | Agregado → individual limpia `aggregate_data` | ✅ RPC |
| G6 | Individual → agregado elimina records | ✅ RPC |
| G7 | Bloqueo cross-tenant | ✅ RPC |
| G8 | Limpieza de datos QA aun ante fallo E2E | ✅ `afterEach` + cleanup RPC |

## Fuera de alcance (no fallar QA por esto)

- Flutter (P4)
- QR / KPIs / vínculo obligatorio a `/eventos`

## Criterio de cierre

P2 + P2.x + P3 **cerrados** cuando A1–A8, B1–B6, C1–C5, D1–D7 y F3 estén OK en staging.
E2/E3 y C6/C7 recomendados pero no bloquean si el piloto es solo admin.

**Comandos de evidencia:** `npm run qa:attendance` (16 PASS), `npm run qa:attendance:e2e` (3 PASS), `npm run test:unit` (17 PASS), `npm run build` (PASS).

**Siguiente:** completar las filas manuales restantes con usuario piloto no técnico; después P4 asistencia móvil (Flutter).
