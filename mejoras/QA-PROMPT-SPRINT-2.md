# Agent prompt — QA Sprint 2 (escalabilidad datos financieros)

Copia este bloque al iniciar QA, o referencia con `@mejoras/QA-PROMPT-SPRINT-2.md`.

**Prerequisito:** Sprint 1 en PASS (auth deduplicada).  
**Rama:** `perf/sprint-2-data-scale` (o la que implemente Sprint 2).

---

## Rol

Eres QA engineer validando **Sprint 2**: dashboard con payload acotado, paginación server-side en finanzas, eliminación de queries redundantes y lookups admin targeted.

Reporta **PASS / FAIL / BLOCKED** con pasos, esperado vs actual, severidad.

## Alcance

| ID | Qué validar |
|----|-------------|
| P0-DATA-1 | Dashboard sin arrays completos; KPIs/charts correctos |
| P0-DATA-2 | Paginación y filtros de fecha en servidor (aportes + transacciones) |
| P1-DATA-3 | Sin segunda query `attachIncomeTypeIds` en listados |
| P1-DATA-4 | Admin users: sin scan `pageSize: null` |
| P2-DATA-5 | Perfil miembro → tab finanzas sin waterfall (si implementado) |

**Fuera de alcance:** Sprint 3 (`unstable_cache`, `loading.tsx`, bundle cleanup).

## Pre-requisitos

- [ ] Sprint 1 QA en GO
- [ ] Migraciones Sprint 2 aplicadas en Supabase
- [ ] `npm run build` + `npm run dev`
- [ ] Usuario **U1** con acceso finanzas (`canAuthorizeFinances` si aplica autorizaciones)
- [ ] Usuario **U-admin** con permisos settings/users
- [ ] Iglesia de prueba con **datos conocidos:**
  - ≥ 30 aportes en distintos meses/categorías
  - ≥ 30 transacciones ledger
  - ≥ 1 pendiente de autorización (si módulo activo)
  - (Ideal) segunda iglesia **U-other** para aislamiento tenant

Anotar totales de referencia (suma mes actual, count registros) **antes** de probar.

---

## Cómo verificar performance (objetivo del sprint)

### PERF-01 — Tamaño respuesta dashboard

**Pasos:** U1 → `/dashboard` → DevTools Network → documento RSC/fetch principal.

**Esperado:**
- Payload de datos del dashboard **notablemente menor** que baseline pre-Sprint 2
- Objetivo orientativo: **< ~50 KB** de props serializadas (iglesia mediana)
- **No** debe aparecer en HTML/JSON un array masivo de `contributions` / `ledgerEntries` con cientos de objetos completos

**FAIL si:** Response incluye historial completo como en branch pre-Sprint 2.

---

### PERF-02 — Paginación aportes (servidor)

**Pasos:**
1. U1 → `/finances/contributions`
2. Anotar total paginador y filas visibles
3. Ir a `?page=2` (o botón página 2)
4. DevTools: comparar tamaño respuesta vs página 1

**Esperado:**
- Página 2 muestra **distintas** filas (no repetición por slice client)
- Tamaño respuesta **similar** entre páginas (no crece con total histórico)
- URL refleja `page` (y `size` si aplica)

---

### PERF-03 — Filtro mes aportes (servidor)

**Pasos:**
1. Filtrar mes con datos conocidos (ej. mes pasado)
2. Verificar URL (`month=` o equivalente)
3. Contar filas vs total histórico

**Esperado:**
- Solo aportes del mes seleccionado
- KPIs del mes coherentes con suma manual de filas visibles (o total server si hay más páginas)

---

### PERF-04 — Paginación transacciones

**Pasos:** Igual PERF-02/03 en `/finances/transactions`.

**Esperado:** Misma lógica server-side; filtros fund/fecha en URL.

---

### PERF-05 — Una round-trip listado aportes (P1-DATA-3)

**Pasos:** Cargar `/finances/contributions` con DevTools Network filtrado Supabase/PostgREST.

**Esperado:**
- **Una** llamada RPC `sp_get_income_entries` (o paginada) por carga de página
- **No** segunda petición REST a `income_entries?select=income_id,income_type_id`

**FAIL si:** persiste query de enriquecimiento separada.

---

## Matriz funcional — Dashboard (P0-DATA-1)

### DASH-01 — KPIs hero y tarjetas

**Pasos:** `/dashboard` con U1.

**Esperado:**
- Ofrenda hoy, catecúmenos, versículo, KPIs miembros/fondos visibles
- Valores coinciden con datos de referencia (± redondeo)

---

### DASH-02 — Chart contribuciones por periodo

**Pasos:** Cambiar periodo (semana/mes/trimestre/año) en toolbar.

**Esperado:**
- Gráfico actualiza correctamente
- Totales del periodo coherentes
- **Preferible:** cambio vía navegación/refresh server, no lag severo por re-scan en cliente

---

### DASH-03 — Chart ingreso vs gasto

**Pasos:** Cambiar periodo en chart ledger.

**Esperado:** Barras ingreso/gasto coherentes con transacciones conocidas del periodo.

---

### DASH-04 — Pendientes de autorización

**Pasos:** Ver lista pendientes en dashboard.

**Esperado:**
- Muestra items pendientes reales (hasta límite N)
- Link/acción hacia transacciones funciona

---

### DASH-05 — Regresión post-mutación

**Pasos:** Crear o autorizar una transacción → volver a dashboard.

**Esperado:** KPIs/pendientes reflejan cambio tras refresh (revalidatePath).

---

## Matriz funcional — Aportes (P0-DATA-2)

### CONT-01 — Listado página 1

**Esperado:** `pageSize` filas (default 25 o el configurado); paginador correcto.

---

### CONT-02 — Navegación páginas

**Esperado:** Primera/última página; total páginas = ceil(total/pageSize).

---

### CONT-03 — Filtro por fondo

**Pasos:** `?fund=<uuid>` o selector UI.

**Esperado:** Solo aportes del fondo; paginación respecto al subset.

---

### CONT-04 — Filtro categoría (diezmo/ofrenda/donación)

**Esperado:** Categorías correctas (depende de P1-DATA-3 `income_type_id`).

---

### CONT-05 — CRUD aporte

**Pasos:** Crear → editar → eliminar aporte de prueba.

**Esperado:** Sin error; lista actualizada; fondos KPI coherentes.

---

### CONT-06 — Export / etiquetas UI

**Esperado:** Etiquetas fecha, moneda RD, nombres donantes sin roturas.

---

## Matriz funcional — Transacciones (P0-DATA-2)

### TX-01 — Listado paginado

Igual CONT-01/02.

---

### TX-02 — Filtro mes / rango

**Esperado:** Coherente con `MonthPeriodFilter` y URL.

---

### TX-03 — Crear gasto / ingreso operacional

**Esperado:** Mutación OK; aparece en listado correcto.

---

### TX-04 — Autorizar pendiente (si U1 tiene permiso)

**Esperado:** Estado cambia; desaparece de pendientes dashboard.

---

## Matriz admin (P1-DATA-4)

### ADM-01 — Registrar acceso sistema a miembro

**Pasos:** U-admin → members → dar acceso / settings users → registrar.

**Esperado:** Usuario creado; temp password si aplica; **sin timeout** en iglesia con muchos miembros.

---

### ADM-02 — Contexto acceso miembro existente

**Pasos:** Abrir drawer/modal acceso sistema en miembro con usuario ya vinculado.

**Esperado:** Carga rápida; muestra usuario correcto.

---

### ADM-03 — Reset password acceso

**Esperado:** Funciona; no escanea lista completa (perceptible en logs si hay muchos users).

---

## Matriz perfil miembro (P2-DATA-5, si aplica)

### PROF-01 — Tab finanzas

**Pasos:** `/members/profile?id=...&tab=finances` (o equivalente).

**Esperado:**
- Datos visibles sin delay de segundo fetch **o** un solo request server
- Paginación/límite si hay muchos movimientos

---

## Seguridad multitenant (must pass)

| ID | Caso | FAIL si… |
|----|------|----------|
| SEC-01 | U1 no ve aportes de U-other | Aparecen filas de otra iglesia |
| SEC-02 | U1 no ve ledger ajeno | IDs/transacciones cruzadas |
| SEC-03 | Dashboard summary otro church_id | KPIs de otra iglesia vía manipulación param |
| SEC-04 | RPC sin sesión | Datos sin auth |

---

## Regresiones Sprint 1

Ejecutar smoke mínimo post-Sprint 2:

- [ ] AUTH-03 — login normal
- [ ] AUTH-05–07 — temp password flow
- [ ] AUTH-11 — server action finanzas

---

## Smoke build

```bash
npm run build
npm run lint
```

---

## Checklist resumen

| ID | Caso | Pass |
|----|------|------|
| PERF-01 | Payload dashboard acotado | ☐ |
| PERF-02 | Paginación aportes server | ☐ |
| PERF-03 | Filtro mes aportes server | ☐ |
| PERF-04 | Paginación transacciones | ☐ |
| PERF-05 | Sin attachIncomeTypeIds | ☐ |
| DASH-01–05 | Dashboard funcional | ☐ |
| CONT-01–06 | Aportes CRUD + filtros | ☐ |
| TX-01–04 | Transacciones | ☐ |
| ADM-01–03 | Admin lookup | ☐ |
| PROF-01 | Finanzas perfil (si scope) | ☐ |
| SEC-01–04 | Tenant | ☐ |
| S1-smoke | Auth regresión | ☐ |
| BUILD | build + lint | ☐ |

**Release Sprint 2:** PERF-01, PERF-02, SEC-01–02 en PASS; blockers de CRUD en PASS.

---

## Prompt listo para pegar (agente QA)

```
@mejoras/QA-PROMPT-SPRINT-2.md @mejoras/PERFORMANCE-ROADMAP.md @mejoras/AGENT-PROMPT-SPRINT-2.md

Ejecuta QA completo del Sprint 2 en rama perf/sprint-2-data-scale.

Pre-requisito: Sprint 1 en GO.
Entorno: npm run dev localhost:3000.
Datos: iglesia con ≥30 aportes y ≥30 transacciones; anota totales de referencia antes de probar.

Prioriza:
1. PERF-01 (payload dashboard)
2. PERF-02/03/04 (paginación server)
3. PERF-05 (sin query extra income_type)
4. SEC-01/02 (tenant)
5. CONT-05 / TX-03 (CRUD)

Por cada caso: PASS/FAIL/BLOCKED, pasos, esperado vs actual, severidad.
Final: tabla resumen + GO/NO-GO merge + comparación tamaño respuesta dashboard vs baseline si puedes estimarlo.
```
