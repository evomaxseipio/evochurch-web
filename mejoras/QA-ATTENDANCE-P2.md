# QA — P2 Motor de asistencia + P2.x Categorías

**Rama:** `feat/attendance-engine`  
**Fecha:** 2026-07-13  
**Estado:** 📋 Checklist para piloto / staging

## Prerrequisitos

- [ ] Migraciones aplicadas: `20260713230000_attendance_engine`, `20260713240000_ministry_category`
- [ ] Usuario con `attendance:read` + `attendance:write` (roles admin suelen tenerlos por seed)
- [ ] Al menos un ministerio con ≥3 miembros en el roster

## A — Categorías (P2.x)

| # | Caso | Resultado |
|---|------|-----------|
| A1 | Abrir `/ministerios` → editar un ministerio → campo **Categoría** visible | ☐ |
| A2 | Asignar categoría **Casas fuente** a una casa / **Discipulado** a un estudio | ☐ |
| A3 | Filtro de categoría en listado muestra solo ese grupo | ☐ |
| A4 | Chip/badge de categoría visible en tarjeta o tabla | ☐ |

## B — Sesiones de asistencia (P2)

| # | Caso | Resultado |
|---|------|-----------|
| B1 | Menú **Asistencia** visible con permiso | ☐ |
| B2 | Preset **Sesión de casa** abre drawer con tipo `house_group` | ☐ |
| B3 | Preset **Sesión de estudio** abre con tipo `bible_study` | ☐ |
| B4 | Picker de ministerios prioriza categoría alineada (casas→Casas; estudio→Discipulado); si no hay, muestra todos activos | ☐ |
| B5 | Crear sesión sin ministerio (tipo casa/estudio) → error / bloqueo | ☐ |
| B6 | Crear sesión OK → redirige al checklist | ☐ |

## C — Checklist / roster

| # | Caso | Resultado |
|---|------|-----------|
| C1 | Checklist muestra **solo** miembros del ministry_id (no toda la iglesia) | ☐ |
| C2 | Ministerio sin roster → mensaje vacío claro | ☐ |
| C3 | Marcar presente / ausente / tarde en ≥3 personas → Guardar | ☐ |
| C4 | Reabrir sesión → estados persistidos | ☐ |
| C5 | “Todos presentes” + guardar funciona | ☐ |
| C6 | Editar sesión (fecha/título) desde checklist | ☐ |
| C7 | Eliminar sesión → desaparece del listado | ☐ |

## D — Permisos / filtro

| # | Caso | Resultado |
|---|------|-----------|
| D1 | Filtro por tipo en listado (casa / estudio / culto) | ☐ |
| D2 | Usuario solo `attendance:read` ve listado pero no crear/editar | ☐ |
| D3 | Usuario sin `attendance:read` no entra a `/attendance` | ☐ |

## E — Regresión corta

| # | Caso | Resultado |
|---|------|-----------|
| E1 | `/ministerios` CRUD (crear/editar/borrar) sigue OK | ☐ |
| E2 | `/eventos` abre normal | ☐ |
| E3 | `npm run build` exit 0 | ✅ (2026-07-13) |

## Fuera de alcance (no fallar QA por esto)

- Checklist solo-niños (P3)
- Flutter (P4)
- QR / KPIs / vínculo obligatorio a `/eventos`
- Tipos de categoría custom por iglesia

## Criterio de cierre

P2 + P2.x **cerrados** cuando A1–A4, B1–B6, C1–C5 y E3 están OK en staging.  
D2/D3 y C6/C7 recomendados pero no bloquean si el piloto es solo admin.
