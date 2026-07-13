# EvoChurch Web — Project Architecture v1.0

> Arquitectura definitiva para **nuevas features**, con foco inicial en **BackOffice / Sales Hub**.
> Aplica a todo código nuevo. El **Church Console** legacy migra gradualmente; no se reorganiza de golpe.
>
> **Stack objetivo:** Next.js 15+ (App Router) · TypeScript · Material UI (M3) · Supabase · TanStack Query · React Hook Form · Zod · Lucide

---

## 1. Principios

| Principio | Regla |
|-----------|--------|
| **Feature-first** | Todo lo que crece por producto vive en `src/features/{feature}/`. |
| **Thin routing** | `src/app/` solo enruta, compone layout y delega. Sin lógica de negocio. |
| **Una dirección de dependencias** | `app → features → shared/core`. Nunca al revés. |
| **Supabase encapsulado** | Solo **repositories** hablan con Supabase. UI nunca importa `@supabase/*`. |
| **Reglas en services** | Validación de negocio (Zod + invariantes) en **services**, no en UI ni repository. |
| **Tipos explícitos** | Entity (BD) ≠ DTO (entrada/salida API) ≠ ViewModel (UI). |
| **KISS / YAGNI** | No crear carpetas vacías “por si acaso”. Crear al primer uso real. |

---

## 2. Estructura de carpetas (completa)

```text
src/
├── app/                          # Next.js App Router — SOLO routing y composición
│   ├── (auth)/                   # login, password reset
│   ├── auth/                     # callbacks OAuth
│   ├── apps/
│   │   ├── church/(console)/     # Church SaaS (legacy + migración gradual)
│   │   └── backoffice/(console)/ # BackOffice comercial (estándar v1)
│   ├── org/(console)/            # Portal enterprise org
│   ├── layout.tsx
│   └── globals.css
│
├── features/                     # ★ Vertical slices — estándar para código nuevo
│   ├── organizations/
│   ├── contacts/                 # futuro
│   ├── activities/               # futuro
│   └── …
│
├── shared/                       # Reutilizable SIN reglas de negocio
│   ├── ui/                       # Botones, Dialogs, Tables, Inputs (MUI wrappers)
│   ├── layouts/                  # PageHeader, SplitPane, DrawerShell
│   ├── hooks/                    # useDebounce, useMediaQuery, useDisclosure
│   ├── utils/                    # formatDate, cn, pagination helpers
│   └── constants/                # breakpoints, z-index, defaults UI
│
├── core/                         # Infraestructura transversal (sin UI de feature)
│   ├── auth/                     # sesión, guards, permisos BackOffice
│   ├── supabase/                 # clientes browser/server/admin, rpc helpers
│   ├── errors/                   # clases base, mappers, error codes
│   ├── config/                   # env, feature flags
│   └── query/                    # QueryClient factory, keys helpers, defaults
│
├── providers/                    # Árbol de providers React (client)
│   ├── app-providers.tsx         # composición raíz
│   ├── query-provider.tsx        # TanStack Query
│   ├── theme-provider.tsx        # MUI ThemeProvider + CssBaseline
│   └── toast-provider.tsx        # Sonner / notificaciones
│
├── lib/                          # Legacy Church Console + utilidades compartidas
│   ├── apps/                     # church-routes, backoffice-routes
│   ├── auth/                     # app-session (church tenant) — migrar a core/auth
│   ├── services/                 # RPC legacy — NO agregar features nuevas aquí
│   ├── i18n/
│   └── …
│
├── components/                   # Legacy Church UI — congelado; no agregar BackOffice aquí
│
├── types/                        # Tipos globales raros (env.d.ts companions)
├── styles/                       # tokens globales, MUI theme overrides
└── i18n/                         # next-intl messages
```

### Qué va en cada capa raíz

| Carpeta | Responsabilidad | Qué NO va |
|---------|-----------------|-----------|
| **`app/`** | Rutas, layouts, metadata, `loading`/`error`, server actions **delgadas** que delegan al service | Componentes grandes, queries Supabase, Zod schemas |
| **`features/`** | Todo el ciclo de una capability de producto | Primitivos UI genéricos |
| **`shared/`** | UI y utilidades agnósticas de dominio | Imports desde `features/*` |
| **`core/`** | Auth, Supabase, errores, config, query client | Componentes de pantalla |
| **`providers/`** | Composición de contextos de app | Lógica de negocio |
| **`lib/`** | Legacy + helpers transversales hasta migración | Features nuevas |

---

## 3. Arquitectura por Feature

Cada feature es un **módulo vertical autocontenido** con API pública en `index.ts`.

```text
src/features/{feature-name}/
├── components/           # UI específica del feature (client + server donde aplique)
│   ├── {feature}-list-view.tsx
│   ├── {feature}-form-drawer.tsx
│   └── {feature}-detail-header.tsx
│
├── pages/                # Compositores de pantalla (NO rutas Next.js)
│   ├── organizations-list-page.tsx
│   └── organization-detail-page.tsx
│
├── hooks/                # TanStack Query + composición UI
│   ├── use-organizations-list.ts
│   ├── use-organization.ts
│   └── use-create-organization.ts
│
├── services/             # Reglas de negocio, orquestación, validación Zod
│   ├── organization.service.ts
│   └── organization.service.errors.ts
│
├── repositories/         # Persistencia — único lugar con Supabase
│   ├── organization.repository.interface.ts
│   ├── supabase-organization.repository.ts
│   └── organization.repository.error.ts
│
├── validations/          # Schemas Zod (input forms + service boundary)
│   ├── create-organization.schema.ts
│   └── update-organization.schema.ts
│
├── schemas/              # Contratos de transporte (Request/Response DTO types)
│   ├── organization.requests.ts
│   └── organization.responses.ts
│
├── types/                # Enums, unions, tipos de dominio compartidos en el feature
│   ├── organization.enums.ts
│   └── organization.types.ts
│
├── models/               # Metadatos de persistencia (table names, realtime topics)
│   └── organization.table.ts
│
├── mappers/              # Entity ↔ ViewModel ↔ DTO (solo cuando hay transformación)
│   └── organization.mapper.ts
│
├── utils/                # Helpers puros del feature (sin Supabase)
│   └── organization-filters.ts
│
└── index.ts              # ★ Public API — solo exportar lo que otras capas pueden usar
```

### Reglas de dependencia dentro del feature

```text
components  →  hooks  →  services  →  repositories  →  core/supabase
     ↓           ↓          ↓
  shared/ui   validations  types/models
                schemas
                mappers
```

- **`components`** no importan `repositories` directamente.
- **`hooks`** llaman **services** (nunca repository).
- **`services`** llaman **repositories** y aplican **validations**.
- **`repositories`** no importan React ni Zod.

### API pública (`index.ts`)

Exportar solo:

- hooks de lectura/escritura
- types/schemas necesarios para forms
- componentes de página composables
- services **solo** si server actions los necesitan (preferir hooks en client, services en server)

No exportar: implementaciones concretas de repository, utils internos.

---

## 4. Shared — qué pertenece aquí

### Sí va en `shared/`

| Categoría | Ejemplos |
|-----------|----------|
| **UI primitivos** | `Button`, `IconButton`, `TextField`, `Select`, `Dialog`, `Drawer`, `DataTable`, `EmptyState`, `Skeleton`, `Chip`, `Badge` |
| **Layouts** | `AppShell`, `PageHeader`, `PageToolbar`, `SplitLayout`, `SidebarNav` |
| **Inputs compuestos** | `SearchInput`, `DateRangePicker`, `PhoneInput` (sin reglas de dominio) |
| **Feedback** | `ConfirmDialog`, `Toast` wrapper, `ErrorState`, `LoadingOverlay` |
| **Hooks genéricos** | `useDebouncedValue`, `usePagination`, `useDisclosure`, `useMediaQuery` |
| **Utils** | formateo de fechas/moneda genérico, `cn()`, helpers de URL/searchParams |
| **Constants** | breakpoints, duraciones de animación, límites de paginación default |

### No va en `shared/`

- Lógica de Organizations, Contacts, Pipeline
- Tipos de dominio (`OrganizationType`, `PipelineStage`)
- Queries Supabase
- Schemas Zod con reglas de negocio
- Componentes que mencionan entidades específicas (`OrganizationForm` → `features/organizations`)

**Test:** si el componente necesita importar algo de `features/`, **no es shared**.

---

## 5. Core — infraestructura

| Módulo | Contenido |
|--------|-----------|
| `core/supabase/` | `createBrowserClient`, `createServerClient`, `createAdminClient`, `assertRpcSuccess` |
| `core/auth/` | sesión BackOffice, guards, `requireBackofficeSession()` |
| `core/errors/` | `AppError`, `ErrorCode`, `toUserMessage()`, mappers |
| `core/config/` | env validado con Zod, feature flags |
| `core/query/` | `makeQueryClient()`, default staleTime, `queryKeys` factory pattern |

> **Migración:** código en `src/lib/auth/` y `src/lib/supabase/` se mueve a `core/` cuando se toque; no big-bang.

---

## 6. App Router — convención de rutas

### BackOffice (estándar v1)

```text
src/app/apps/backoffice/(console)/
├── layout.tsx              # shell, session guard, providers
├── organizations/
│   ├── page.tsx            # RSC: prefetch inicial → pasa a ListPage
│   ├── [id]/page.tsx       # RSC: detalle
│   └── actions.ts          # server actions DELGADAS → service
└── sales/
    └── page.tsx
```

**`page.tsx` delgado:**

1. Guard de auth/permiso
2. Prefetch opcional (SSR) vía service
3. Render `<OrganizationsListPage initialData={…} />` desde `features/organizations/pages/`

### Church Console (legacy)

Mantiene `src/app/apps/church/(console)/` + `src/components/` hasta migración feature-by-feature.

---

## 7. Flujo de datos oficial

### Client (interactivo)

```text
UI Component
    ↓ evento / submit
Feature Hook (TanStack Query mutation / query)
    ↓
Feature Service (validación Zod + reglas de negocio)
    ↓
Feature Repository (Supabase)
    ↓
PostgreSQL (sales.* / public.* / RPC)
```

### Server (RSC + Server Actions)

```text
page.tsx / actions.ts
    ↓
Feature Service
    ↓
Feature Repository
    ↓
Supabase (server client o admin según RLS)
```

### Reglas

| Capa | Puede | No puede |
|------|-------|----------|
| **UI** | render, eventos, estado local UI | Supabase, Zod de negocio complejo |
| **Hook** | cache, invalidación, loading/error UI state | reglas de negocio, SQL |
| **Service** | Zod, invariantes, orquestar repos | JSX, TanStack Query |
| **Repository** | CRUD, filtros, paginación SQL/PostgREST | validar negocio, transformar a ViewModel |

---

## 8. Formularios — React Hook Form + Zod

### Ubicación

- Schema: `features/{f}/validations/{action}-{entity}.schema.ts`
- Infer types: `type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>`

### Patrón

```text
validations/create-organization.schema.ts   ← Zod (fuente de verdad del form)
        ↓
components/organization-form-drawer.tsx     ← useForm + zodResolver
        ↓
hooks/use-create-organization.ts            ← useMutation → service.create()
        ↓
services/organization.service.ts            ← re-valida con mismo schema (defensa)
```

### Estándares

- Un schema Zod por operación (`create`, `update`, `archive`).
- Service **re-parsea** input con el mismo schema (never trust client).
- Mensajes de error Zod → map a campos RHF o toast según severidad.
- Defaults del form en el componente; defaults de BD en repository/migration.

---

## 9. Estado

### TanStack Query — estado del servidor

| Uso | Patrón |
|-----|--------|
| Listados | `useQuery` + `queryKey: ['organizations', 'list', filters]` |
| Detalle | `useQuery` + `queryKey: ['organizations', 'detail', id]` |
| Mutaciones | `useMutation` + `invalidateQueries` en `onSuccess` |
| Prefetch SSR | `queryClient.prefetchQuery` en RSC → `HydrationBoundary` |
| Optimistic UI | solo cuando el service lo permita explícitamente |

**Query keys:** factory central por feature en `features/{f}/hooks/query-keys.ts`.

### Estado local — `useState` / `useReducer`

- Drawer abierto/cerrado
- Tab activo
- Selección de fila
- Estado efímero de UI

### Context — uso restringido

| Permitido | Evitar |
|-----------|--------|
| Theme (MUI) | Cache de listados |
| Session shell (usuario, permisos read-only) | Form state |
| Feature flags | Datos de Organizations |

### URL como estado

- Filtros, búsqueda, paginación, sort → **`searchParams`** (shareable, back button friendly).

---

## 10. Errores — estrategia

### Capas de error

| Capa | Tipo | Ejemplo |
|------|------|---------|
| **Repository** | `OrganizationRepositoryError` + `code` | `NOT_FOUND`, `CONFLICT`, `FORBIDDEN` |
| **Service** | `OrganizationServiceError` extends `AppError` | `DUPLICATE_ORGANIZATION`, `INVALID_TRANSITION` |
| **Server Action** | `{ ok: true, data } \| { ok: false, error, errorKey? }` | union discriminada |
| **Hook** | expone `error` de TanStack Query + mapea a mensaje UI | |
| **UI** | toast (Sonner) + inline field errors | |

### Reglas

1. **Nunca** tragar errores silenciosamente.
2. Repository traduce `PostgrestError` → error tipado.
3. Service traduce error de repo → error de dominio comprensible.
4. UI muestra mensaje humano; logs técnicos en dev/console.
5. `error.tsx` / Error Boundaries para fallos de render o SSR.

---

## 11. Tipado — Entities, DTOs, ViewModels

### Convención de casing

| Tipo | Casing | Dónde |
|------|--------|-------|
| **Entity** | `snake_case` | Igual que fila PostgreSQL |
| **Request DTO** | `camelCase` | Input service/API desde UI |
| **Response DTO** | `camelCase` | Output service hacia hooks |
| **ViewModel** | `camelCase` | Props de componentes UI |

### Definiciones

```text
Entity       = shape de BD (Organization) — types/ + repository
Request DTO  = lo que entra al service (CreateOrganizationRequest) — schemas/
Response DTO = lo que sale del service (OrganizationListResponse) — schemas/
ViewModel    = lo que consume la UI (OrganizationListItemVm) — mappers/
```

### Mappers

- Obligatorios cuando Entity ≠ ViewModel (casi siempre en UI).
- Opcionales en CRUD simple si Response DTO = ViewModel.
- Viven en `features/{f}/mappers/`.
- **Repository no mapea.** Devuelve Entity cruda.

### Enums

- BD: `UPPER_SNAKE` string (`CHURCH`, `ACTIVE`)
- TS: `const` arrays + derived type en `types/{feature}.enums.ts`
- UI labels: i18n en componente, no en repository

---

## 12. Convenciones de nombres

### Carpetas

- kebab-case: `organizations`, `sales-hub`
- una feature = un sustantivo singular o plural consistente (`organizations`, no `org`)

### Archivos

| Artefacto | Patrón | Ejemplo |
|-----------|--------|---------|
| Componente | `{name}.tsx` o `{entity}-{role}.tsx` | `organization-form-drawer.tsx` |
| Hook | `use-{entity}-{action}.ts` | `use-organizations-list.ts` |
| Service | `{entity}.service.ts` | `organization.service.ts` |
| Repository interface | `{entity}.repository.interface.ts` | |
| Repository impl | `supabase-{entity}.repository.ts` | |
| Zod schema | `{action}-{entity}.schema.ts` | `create-organization.schema.ts` |
| Mapper | `{entity}.mapper.ts` | |
| Page composer | `{entity}-{view}-page.tsx` | `organizations-list-page.tsx` |
| Server actions | `actions.ts` (en app route) | |

### Símbolos TypeScript

| Artefacto | Convención | Ejemplo |
|-----------|------------|---------|
| Interface repo | `I{Entity}Repository` | `IOrganizationRepository` |
| Service class/fns | `{entity}Service` o `createOrganization` | funciones nombradas |
| Hook | `use{Entity}{Action}` | `useCreateOrganization` |
| Component | `PascalCase` | `OrganizationFormDrawer` |
| Enum type | `{Entity}{Field}` | `OrganizationStatus` |
| Const enum values | `UPPER_SNAKE` | `ORGANIZATION_STATUSES` |
| Query keys | `{feature}Keys` | `organizationKeys.list(filters)` |

### Exports

- Prefer **named exports** (no default) salvo `page.tsx` / `layout.tsx` Next.js.

---

## 13. Supabase — acceso a datos

### Dos contextos de BD

| App | Schema principal | Tenant |
|-----|------------------|--------|
| Church Console | `public.*` | `church_id` |
| BackOffice | `sales.*` | sin tenant iglesia (IAM BackOffice futuro) |

### Cliente por contexto

| Contexto | Cliente |
|----------|---------|
| Server Action / RSC (RLS) | `createServerClient()` |
| BackOffice sin RLS maduro | `createAdminClient()` en server-only |
| Browser (Realtime) | `createBrowserClient()` vía hooks |

### RPC vs PostgREST directo

- **MVP Organizations:** repository directo a `sales.organizations` (ya migrado).
- **Church legacy:** RPC (`spgetprofiles`, etc.).
- **Regla futura:** operaciones complejas → RPC; CRUD simple → repository + RLS.

---

## 14. UI — Material UI + Lucide

### BackOffice (nuevo)

- **MUI v6+** con theme M3 en `src/styles/theme/` + `providers/theme-provider.tsx`
- Iconos: **Lucide** (`lucide-react`)
- Layouts compartidos en `shared/layouts/`

### Church Console (legacy)

- Tailwind + `design.css` hasta migración explícita
- No mezclar MUI en pantallas church sin plan de migración

---

## 15. Checklist — crear una feature nueva

```text
□ 1. docs: domain-model → database-design → sql (si aplica)
□ 2. src/features/{name}/types + models
□ 3. repositories (interface + supabase impl)
□ 4. validations (Zod) + schemas (DTO)
□ 5. services
□ 6. hooks + query-keys
□ 7. mappers (si Entity ≠ ViewModel)
□ 8. components + pages
□ 9. app route delgada
□ 10. shared/ solo si hay 2+ features que reutilizan el mismo primitivo
□ 11. index.ts exporta API pública
```

---

## 16. Relación con código existente

| Existente | Estado v1 |
|-----------|-----------|
| `src/lib/services/*.ts` | Legacy Church — congelar para features nuevas |
| `src/components/*` | Legacy Church UI |
| `src/features/organizations/` | **Referencia canónica** BackOffice |
| `.docs/features/{f}/` | Documentación de producto/dominio |
| `.evo/architecture/` | Decisiones de arquitectura |

---

## 17. Referencia rápida — Organizations (implementado parcialmente)

```text
✅ features/organizations/types
✅ features/organizations/models
✅ features/organizations/repositories
⬜ features/organizations/validations
⬜ features/organizations/schemas
⬜ features/organizations/services
⬜ features/organizations/hooks
⬜ features/organizations/mappers
⬜ features/organizations/components
⬜ features/organizations/pages
⬜ app/apps/backoffice/(console)/organizations/
⬜ providers/query-provider (TanStack Query)
⬜ shared/ui (MUI wrappers)
```

---

## 18. Documentos relacionados

- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) — mapa del sistema
- [MULTI_TENANT.md](./MULTI_TENANT.md) — sesión church tenant
- [AI_ENGINEERING_GUIDE.md](../engineering/AI_ENGINEERING_GUIDE.md) — DoD y calidad
- [AI_FRONTEND_GUIDE.md](../engineering/AI_FRONTEND_GUIDE.md) — patrones legacy church UI
- [AI_DATABASE_GUIDE.md](../engineering/AI_DATABASE_GUIDE.md) — RPC y migraciones

---

**Versión:** 1.0 · **Ámbito:** evochurch-web · **Próxima revisión:** al cerrar Organizations MVP 0.1 (Service + UI conectada)
