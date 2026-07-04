# Agent prompt — Módulo Reportes (por sección)

Copia **una sección** (bloque `Prompt para agente`) por sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-REPORTES-MODULE.md`.

**Rama sugerida:** `feat/reportes-module`  
**Alcance:** hub de reportes + 4 MVP + infraestructura de exportación  
**Principios:** reutilizar datos existentes, DRY en generadores PDF/XLSX, KISS (sin BI custom)

---

## Cómo usar este documento

1. Ejecutar secciones **en orden** (REP-0 → REP-6). No paralelizar REP-1…REP-5 antes de REP-0.
2. Cada sección es **autocontenida** para un agente: contexto, archivos, tareas, DoD, dependencias.
3. Plantillas oficiales en `reports docs/`:
   - `Informe financiero mensual modificado.xlsx` — CEAD mensual
   - `Formulario estadístico en PDF editable[1].pdf` — CEAD anual
4. **No commits** salvo que el usuario lo pida.
5. Al cerrar el módulo completo: `npm run build` + checklist QA (§ REP-QA).

### Orden de ejecución

```
REP-0  Infraestructura (permisos, nav, lib export, tipos)
  ↓
REP-1  Hub UI /reports
  ↓
REP-2  Informe financiero mensual CEAD     ← MVP #1
REP-3  Directorio de miembros              ← MVP #2
REP-4  Informe estadístico anual CEAD    ← MVP #3
REP-5  Resumen ejecutivo mensual           ← MVP #4
  ↓
REP-6  Reportes financieros complementarios (opcional post-MVP)
  ↓
REP-QA QA manual + build
```

### Dependencias entre secciones

| Sección | Depende de | Entrega clave |
|---------|------------|---------------|
| REP-0 | — | `src/lib/reports/*`, permisos, nav |
| REP-1 | REP-0 | `/reports`, cards, filtros período |
| REP-2 | REP-0, REP-1 | XLSX/PDF mensual CEAD |
| REP-3 | REP-0, REP-1 | PDF/XLSX directorio |
| REP-4 | REP-0, REP-1 | PDF anual CEAD |
| REP-5 | REP-0, REP-1 | PDF 1 página ejecutivo |
| REP-6 | REP-0…REP-2 | Fondos, P&L, por miembro |

---

## Contexto obligatorio (todas las secciones)

| Archivo | Por qué |
|---------|---------|
| `AGENTS.md` | Multitenant, `sp_get_session_context`, convenciones |
| `uploads/CONTEXT.md` | RPCs, módulos financieros y miembros |
| `src/lib/auth/app-session.ts` | Sesión (`churchId`, permisos) |
| `src/lib/navigation.ts` | Nav principal — agregar Reportes |
| `src/lib/dashboard/aggregate.ts` | KPIs y agregaciones reutilizables |
| `src/lib/services/member-finances.ts` | Contribuciones por miembro |
| `src/lib/members/types.ts` | Campos demográficos y membresía |
| `src/lib/contributions/types.ts` | Categorías: `tithe`, `offering`, `donation` |
| `src/lib/transactions/types.ts` | Egresos por tipo |
| `reports docs/*.xlsx`, `reports docs/*.pdf` | Plantillas CEAD oficiales |

### Estado actual del producto (importante)

- Las exportaciones en finanzas/miembros son **stubs** (`toast.success("Reporte generado…")`) — no hay PDF/XLSX real aún.
- `package.json` **no** incluye librerías de exportación — REP-0 debe elegir e instalar (p. ej. `exceljs` + `@react-pdf/renderer` o generación server-side).
- Dashboard ya agrega datos reales: miembros, contribuciones, ledger, fondos (`fetchDashboardPayload`).
- Rol **Tesorero** en UI: “Finanzas, Reportes” (`src/lib/admin-users/roles.ts`).

### Decisiones de producto (cerradas)

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | ¿Dónde vive Reportes? | Nueva ruta `/reports` en nav principal (no dentro de Configuración). |
| 2 | Permisos | `reports:read`, `reports:export`. Tesorero y Admin: ambos. Pastor: read+export. Secretario: read+export solo reportes de membresía. |
| 3 | Período por defecto | Mes calendario anterior (informes suelen cerrarse a fin de mes). |
| 4 | Formato CEAD | Replicar **estructura** de plantillas en `reports docs/`; no exigir pixel-perfect en v1. |
| 5 | Ministerios / asistencia | Campos sin data → mostrar vacío o “N/D”; no bloquear MVP. |
| 6 | Envíos al concilio (diezmo 10%, IBCR 3%, etc.) | v1: sección visible con montos calculados **solo si** hay mapeo explícito; resto editable manual post-export. |

---

# REP-0 — Infraestructura de reportes

## Prompt para agente

```
Eres ingeniero senior Next.js 16 + Supabase multitenant en evochurch-web.

Implementa REP-0 (Infraestructura de reportes) según @mejoras/AGENT-PROMPT-REPORTES-MODULE.md § REP-0.

Reglas:
- Lee AGENTS.md y uploads/CONTEXT.md antes de codear.
- Tenant: church_id solo desde getAppSession() / getActionSession().
- Migración SQL para permisos reports:read y reports:export.
- Instala dependencias mínimas para PDF y XLSX (documentar elección en comentario breve).
- Crear src/lib/reports/ con tipos, helpers de período y generadores base reutilizables.
- No implementar reportes individuales aún — solo infra compartida.
- Diff mínimo; no commits salvo que el usuario lo pida.
- Al terminar: npm run build

Marca DoD de REP-0 antes de pasar a REP-1.
```

## Tareas

### REP-0.1 — Permisos y BD

- [x] Migración `supabase migration new reports_permissions`:
  - Insertar en `app_permissions`: `reports:read`, `reports:export`.
  - Seed defaults: Admin (1) → ambos; Tesorero (3) → ambos; Pastor (4) → ambos; Secretario (2) → `reports:read` + `reports:export` *(acotar en UI a catálogo membresía en REP-1)*.
- [x] Actualizar `src/lib/auth/permission-keys.ts`.
- [x] Actualizar `src/lib/roles/display.ts` (matriz UI si aplica).
- [x] Extender `sp_get_session_context` / bridge de permisos si hace falta.

### REP-0.2 — Navegación y rutas

- [x] Agregar ítem **Reportes** en `src/lib/navigation.ts` (`/reports`, icono `download` o similar, `permission: "reports:read"`).
- [x] Breadcrumb: `reportes: ["Operación", "Reportes"]`.
- [x] `src/lib/auth/route-permissions.ts`: mapear `/reports` → `reports:read`.

### REP-0.3 — Librería compartida `src/lib/reports/`

Estructura sugerida:

```
src/lib/reports/
├── types.ts           # ReportId, ReportFormat, ReportPeriod, ReportMeta
├── period.ts          # monthBounds, yearBounds, parsePeriodParam
├── filenames.ts       # slug seguro para descargas
├── aggregate/         # funciones puras que agrupan datos (sin I/O)
│   ├── financial.ts
│   └── membership.ts
├── export/
│   ├── pdf.ts         # wrapper generación PDF
│   └── xlsx.ts        # wrapper generación XLSX
└── templates/
    └── cead/          # constantes de filas/labels CEAD (REP-2, REP-4)
```

- [x] `ReportPeriod`: `{ kind: "month" | "year"; year: number; month?: number }`.
- [x] Helpers: `formatReportPeriodLabel`, `previousCalendarMonth`.
- [x] Interface `ReportGenerator<TPayload>`: `{ buildPayload()`, `toPdf()`, `toXlsx() }`.

### REP-0.4 — API / Server actions

- [x] `src/app/(app)/reports/actions.ts`:
  - `generateReportAction(reportId, format, period)` — valida permiso `reports:export`, sesión, devuelve blob/base64 o stream.
- [x] Guard server-side: nunca confiar en cliente para `churchId`.

### REP-0.5 — Servicio de datos

- [x] `src/lib/services/reports.ts`:
  - Orquestador que reutiliza servicios existentes (`fetchContributions`, ledger, members, funds, dashboard aggregate).
  - Una función por payload: `fetchFinancialMonthlyPayload`, `fetchMembershipDirectoryPayload`, etc. (stubs OK; implementación en secciones siguientes).

## DoD REP-0

- [x] `/reports` responde 403 sin permiso y 200 con permiso (página placeholder OK).
- [x] Item Reportes visible en sidebar para Tesorero/Admin.
- [x] `npm run build` exit 0.
- [x] Tipos y stubs de generadores compilando sin errores.

---

# REP-1 — Hub UI de reportes

## Prompt para agente

```
Eres ingeniero senior Next.js 16 + Supabase multitenant en evochurch-web.

Implementa REP-1 (Hub UI /reports) según @mejoras/AGENT-PROMPT-REPORTES-MODULE.md § REP-1.

Prerequisito: REP-0 completado (permisos, lib/reports, ruta base).

Reglas:
- UI en español, tokens y patrones de design.css / componentes existentes.
- Catálogo de reportes driven por config (no hardcode disperso).
- Selector de período (mes/año) global o por tarjeta.
- Botones PDF y Excel llaman generateReportAction (pueden mostrar toast error si payload aún stub).
- Diff mínimo; no commits salvo que el usuario lo pida.
- Al terminar: npm run build

Marca DoD de REP-1.
```

## Tareas

### REP-1.1 — Página

- [x] `src/app/(app)/reports/page.tsx` — server component con `requirePageAccess("/reports")`.
- [x] `src/components/reports/reports-hub-view.tsx` — client o server según patrón del repo.

### REP-1.2 — Catálogo

- [x] `src/lib/reports/catalog.ts`:

```ts
export type ReportCatalogEntry = {
  id: ReportId;
  title: string;
  description: string;
  category: "financial" | "membership" | "executive";
  formats: ("pdf" | "xlsx")[];
  periodKind: "month" | "year" | "none";
  permission: "reports:read"; // export usa reports:export
  rolesHint?: string; // "Tesorero, Pastor"
};
```

Entradas MVP:

| id | title | category | formats | period |
|----|-------|----------|---------|--------|
| `financial-monthly-cead` | Informe financiero mensual (CEAD) | financial | pdf, xlsx | month |
| `membership-directory` | Directorio de miembros | membership | pdf, xlsx | none |
| `membership-annual-cead` | Informe estadístico anual (CEAD) | membership | pdf | year |
| `executive-monthly-summary` | Resumen ejecutivo mensual | executive | pdf | month |

### REP-1.3 — UX

- [x] Grid de cards por categoría (Financieros / Membresía / Ejecutivo).
- [x] Filtro por categoría opcional.
- [x] Selector mes/año (reutilizar patrón de `DateRangeFilter` o toolbar similar).
- [x] Estados: loading, error, éxito descarga.
- [x] Secretario: ocultar tarjetas `financial-*` y `executive-*` (solo membresía).

## DoD REP-1

- [x] Hub usable en desktop y móvil.
- [x] Cada card dispara action con `reportId`, `format`, `period`.
- [x] Permisos respetados en UI y server action.
- [x] `npm run build` exit 0.

---

# REP-2 — Informe financiero mensual CEAD

## Prompt para agente

```
Eres ingeniero senior Next.js 16 + Supabase multitenant en evochurch-web.

Implementa REP-2 (Informe financiero mensual CEAD) según @mejoras/AGENT-PROMPT-REPORTES-MODULE.md § REP-2.

Prerequisitos: REP-0, REP-1.

Reglas:
- Usar plantilla reports docs/Informe financiero mensual modificado.xlsx como referencia de filas.
- Mapear tipos de ingreso/gasto del sistema a líneas CEAD (tabla § Mapeo CEAD abajo).
- Generar XLSX prioritario; PDF opcional (misma data tabular).
- Datos solo del church_id de sesión y período seleccionado.
- Líneas sin mapeo → 0 o vacío; no inventar montos.
- Diff mínimo; no commits salvo que el usuario lo pida.
- Al terminar: npm run build + probar descarga manual un mes con data seed.

Marca DoD de REP-2.
```

## Tareas

### REP-2.1 — Payload

- [x] `fetchFinancialMonthlyPayload(churchId, period)`:
  - Contribuciones del mes agrupadas por `category` (`tithe`, `offering`, `donation`) y por `typeName` / `incomeTypeId`.
  - Egresos del mes agrupados por `ExpenseType.category` y `name`.
  - Totales: ingresos iglesia, ingresos ministerios (si hay tag — sino 0), egresos.
  - Metadatos iglesia: nombre, pastor (session), presbiterio *(desde config iglesia si existe; sino placeholder)*.

### REP-2.2 — Mapeo CEAD (v1)

Implementar en `src/lib/reports/templates/cead/financial-monthly.ts`:

**Sección B — Ingresos generales**

| Línea CEAD | Fuente en EvoChurch |
|------------|---------------------|
| Diezmos | `category === "tithe"` |
| Ofrendas Voluntarias | `category === "offering"` + tipo nombre contiene “voluntaria” o default offering |
| Ofrendas especiales | offering + tipo nombre contiene “especial” |
| Otras ofrendas | offering restante |
| Otros Ingresos | `donation` + actividades pro-fondos |
| Ayudas del Concilio | manual / 0 en v1 |
| Ofrendas del Exterior | manual / 0 en v1 |

**Sección B — Egresos** (mapear `expense_types.name` / categoría a líneas CEAD más cercanas; documentar mapping en código)

| Línea CEAD | Heurística v1 |
|------------|---------------|
| Asignación Pastoral | expense name ~ /pastoral/i |
| Alquileres Casa/Templo | ~ /alquiler|templo|local/i |
| Evangelismo y misiones | ~ /evangel|mision/i |
| Agua,Luz,Teléfono | ~ /servicio|luz|agua|tel/i |
| Mantenimientos Varios | ~ /manten/i |
| Otras Salidas | resto |

**Sección C — Envíos al concilio** (v1: calcular solo si reglas explícitas; sino dejar filas vacías)

| Línea | Regla documentada |
|-------|-------------------|
| 1 Diezmo de la iglesia | 10% de (ingresos − asignación pastoral) — **mostrar fórmula en nota si activo** |
| 2 IBCR 3% | 3% total ingresos |
| 3 Educación Cristiana 1% | 1% total ingresos |
| 4 FPJ 1% | 1% total ingresos |

### REP-2.3 — Generadores

- [x] XLSX: hoja con layout similar a plantilla (encabezado CEAD, secciones A–D).
- [x] PDF: tabla legible A4 (opcional en v1 si XLSX está completo).

### REP-2.4 — Integración

- [x] Registrar generador en `generateReportAction` para `financial-monthly-cead`.
- [x] Nombre archivo: `informe-financiero-cead-{YYYY-MM}.xlsx`.

## DoD REP-2

- [x] Descarga XLSX con totales coherentes vs pantalla Contribuciones + Transacciones mismo período.
- [x] Diezmos del reporte = suma diezmos del mes en BD.
- [x] Sin permiso `reports:export` → action rechazada.
- [x] `npm run build` exit 0.

---

# REP-3 — Directorio de miembros

## Prompt para agente

```
Eres ingeniero senior Next.js 16 + Supabase multitenant en evochurch-web.

Implementa REP-3 (Directorio de miembros) según @mejoras/AGENT-PROMPT-REPORTES-MODULE.md § REP-3.

Prerequisitos: REP-0, REP-1.

Reglas:
- Reemplazar stub "próximamente" en members-list-view si aplica — o centralizar export en /reports.
- Exportar: nombre, rol membresía, teléfono, email, estado (activo/miembro/visita), ciudad.
- Filtros: todos | miembros | visitas | activos | inactivos (reutilizar MemberFilterKey).
- PDF: listado paginado A4; XLSX: una fila por miembro.
- Respetar members:read mínimo; export requiere reports:export.
- Diff mínimo; no commits salvo que el usuario lo pida.
- Al terminar: npm run build

Marca DoD de REP-3.
```

## Tareas

### REP-3.1 — Payload

- [x] `fetchMembershipDirectoryPayload(churchId, filter)`:
  - Reutilizar RPC/servicio de listado miembros (`spgetprofiles` / `src/lib/services/members.ts`).
  - Incluir stats header: total, miembros, visitas, activos, inactivos.

### REP-3.2 — Columnas export

| Columna | Campo |
|---------|-------|
| Nombre completo | `firstName` + `lastName` |
| Apodo | `nickName` |
| Rol | `membershipRole` |
| Teléfono | `contact.mobilePhone` \|\| `contact.phone` |
| Email | `contact.email` |
| Ciudad | `address.cityState` |
| Miembro | `isMember` → Sí/No |
| Activo | `isActive` → Sí/No |

### REP-3.3 — UI

- [x] En hub: selector de filtro antes de descargar.
- [x] Opcional: enlace “Exportar desde Reportes” en `members-list-view.tsx` → `/reports?report=membership-directory`.

## DoD REP-3

- [x] PDF y XLSX descargan con datos reales.
- [x] Filtro “solo miembros activos” funciona.
- [x] 1000+ miembros: export no revienta (paginar PDF o limit razonable documentado).
- [x] `npm run build` exit 0.

---

# REP-4 — Informe estadístico anual CEAD

## Prompt para agente

```
Eres ingeniero senior Next.js 16 + Supabase multitenant en evochurch-web.

Implementa REP-4 (Informe estadístico anual CEAD) según @mejoras/AGENT-PROMPT-REPORTES-MODULE.md § REP-4.

Prerequisitos: REP-0, REP-1.

Reglas:
- Referencia: reports docs/Formulario estadístico en PDF editable[1].pdf
- Autocompletar campos derivables de BD; resto N/D o checkbox desmarcado.
- PDF prioritario (formulario oficial); no XLSX en v1.
- Cálculo edades desde dateOfBirth; bucket CEAD: 0-5, 6-12, 13-17, 18-25, 26-35, 36-50, 51-65, 65+.
- Diff mínimo; no commits salvo que el usuario lo pida.
- Al terminar: npm run build

Marca DoD de REP-4.
```

## Tareas

### REP-4.1 — Payload

- [x] `fetchMembershipAnnualStatsPayload(churchId, year)`:

**Automático desde BD**

| Campo CEAD | Lógica |
|------------|--------|
| Miembros bautizados | `isMember && membership.baptismDate` en el año o histórico *(definir: total acumulado vs bautizados en el año)* |
| Catecúmenos | rol/código `catecumenos` (`CATECHUMEN_ROLE_CODE` en dashboard types) |
| Adherentes / visitas | `!isMember` activos |
| Total congregación | activos |
| Bautizados en Espíritu Santo | `membership.isBaptizedInSpirit` |
| Bautismo en agua este año | `baptismDate` within year |
| Distribución por edades | buckets desde `dateOfBirth` |
| Género | conteo M/F/Otro |
| Ministerios activos | **N/D v1** — lista checkbox manual/post-proceso |

**Manual / N/D v1**

- Presbiterio, código iglesia, credenciales pastor/cónyuge, capillas, campos blancos, profesionales/técnicos, discapacidad, etc.

### REP-4.2 — PDF

- [x] Layout tipo formulario CEAD (encabezado concilio + campos).
- [x] Marcar “N/D” donde no hay data.
- [x] Nota al pie: “Generado por EvoChurch — completar campos marcados N/D”.

### REP-4.3 — Integración

- [x] `membership-annual-cead` en hub; selector solo **año**.

## DoD REP-4

- [x] Totales demográficos cuadran con query manual a miembros activos.
- [x] PDF descargable para año seleccionado.
- [x] `npm run build` exit 0.

---

# REP-5 — Resumen ejecutivo mensual

## Prompt para agente

```
Eres ingeniero senior Next.js 16 + Supabase multitenant en evochurch-web.

Implementa REP-5 (Resumen ejecutivo mensual) según @mejoras/AGENT-PROMPT-REPORTES-MODULE.md § REP-5.

Prerequisitos: REP-0, REP-1.

Reglas:
- Reutilizar buildDashboardKpis y agregaciones de src/lib/dashboard/aggregate.ts — NO duplicar lógica.
- PDF de 1 página para junta directiva: KPIs + variación vs mes anterior.
- Solo PDF en v1.
- Excluir KPIs mock (asistencia, eventos) — marcarlos "Próximamente" o omitir.
- Diff mínimo; no commits salvo que el usuario lo pida.
- Al terminar: npm run build

Marca DoD de REP-5.
```

## Tareas

### REP-5.1 — Contenido PDF (1 página)

**Encabezado:** nombre iglesia, mes/año, generado el {fecha}.

**KPIs (datos reales)**

| KPI | Fuente |
|-----|--------|
| Total miembros / activos / visitas | `MembersListStats` |
| Contribuciones del mes | sum contributions bucket |
| Ingresos vs egresos del mes | ledger stats |
| Saldo fondos activos | `computeFundsBalance` |
| Egresos pendientes autorización | `extractPendingAuthorizations` count |

**Opcional compacto:** mini tabla ingresos por categoría (diezmo/ofrenda/donación).

### REP-5.2 — Implementación

- [x] `fetchExecutiveMonthlyPayload` → compone dashboard services existentes.
- [x] `executive-monthly-summary` generador PDF.

## DoD REP-5

- [x] PDF legible, imprimible, una página en iglesia típica (~20 filas KPI).
- [x] Cifras coinciden con `/dashboard` mismo mes.
- [x] `npm run build` exit 0.

---

# REP-6 — Reportes financieros complementarios (post-MVP)

## Prompt para agente

```
Eres ingeniero senior Next.js 16 + Supabase multitenant en evochurch-web.

Implementa REP-6 (Reportes financieros complementarios) según @mejoras/AGENT-PROMPT-REPORTES-MODULE.md § REP-6.

Prerequisitos: REP-0, REP-1, REP-2 completados.

Reglas:
- Agregar entradas al catálogo REP-1 sin romper hub existente.
- Reutilizar aggregate/financial.ts y servicios finanzas.
- Diff mínimo; no commits salvo que el usuario lo pida.
- Al terminar: npm run build

Marca DoD de REP-6.
```

## Reportes

| id | Título | Descripción |
|----|--------|-------------|
| `financial-income-expense` | Estado de resultados | Ingresos vs egresos por mes, barras/tabla |
| `financial-by-fund` | Movimiento por fondo | Aportes y saldo por fondo en período |
| `financial-by-member` | Contribuciones por miembro | Top N + full export; requiere cuidado privacidad — solo roles finance |

## DoD REP-6

- [x] Al menos 2 de 3 reportes funcionando PDF o XLSX.
- [x] `npm run build` exit 0.

---

# REP-QA — Checklist de cierre

## Prompt para agente QA

```
Eres QA en evochurch-web. Valida el módulo Reportes según @mejoras/AGENT-PROMPT-REPORTES-MODULE.md § REP-QA.

No implementes features. Reporta PASS/FAIL/BLOCKED por caso.
Ejecuta npm run build obligatorio.
```

## Casos

| ID | Rol | Caso | Esperado |
|----|-----|------|----------|
| R-01 | Tesorero | Ver `/reports` | Hub con tarjetas financieras + ejecutivo |
| R-02 | Secretario | Ver `/reports` | Solo tarjetas membresía |
| R-03 | Sin permiso | URL `/reports` | 403 o redirect |
| R-04 | Tesorero | Descargar informe mensual XLSX | Archivo válido, diezmos coherentes |
| R-05 | Secretario | Descargar directorio PDF filtro miembros | Solo miembros |
| R-06 | Admin | Informe anual PDF | Campos auto + N/D visibles |
| R-07 | Pastor | Resumen ejecutivo PDF | KPIs = dashboard |
| R-08 | Tesorero | Export sin `reports:export` *(mutar rol)* | Action rechazada |
| R-09 | Cualquiera | Tenant A no ve data tenant B | church_id aislado |
| R-10 | Build | `npm run build` | exit 0 |

## DoD módulo completo

- [x] REP-0 … REP-5 completados.
- [ ] QA R-01 … R-10 PASS (excepto BLOCKED documentado).
- [x] README en `mejoras/` actualizado con enlace a este doc.

---

## Apéndice — Archivos nuevos esperados (referencia)

```
src/app/(app)/reports/
├── page.tsx
├── loading.tsx
└── actions.ts

src/components/reports/
├── reports-hub-view.tsx
├── report-card.tsx
└── report-period-toolbar.tsx

src/lib/reports/
├── catalog.ts
├── types.ts
├── period.ts
├── templates/cead/
│   ├── financial-monthly.ts
│   └── membership-annual.ts
└── export/
    ├── pdf.ts
    └── xlsx.ts

src/lib/services/reports.ts

supabase/migrations/YYYYMMDDHHMMSS_reports_permissions.sql
```

## Apéndice — Prompt rápido (copiar/pegar)

```
Implementa la sección {REP-X} del módulo Reportes.
Lee @mejoras/AGENT-PROMPT-REPORTES-MODULE.md y @AGENTS.md.
Prerequisitos: {listar}.
Entrega DoD de la sección. npm run build al final. Sin commits.
```
