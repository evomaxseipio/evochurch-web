# EvoChurch BackOffice

## Feature: Organizations — Database Design (MVP 0.1)

> Diseño de persistencia. **No** contiene migraciones SQL, funciones ni RPC.
> Fuente de verdad de dominio: [`organizations-domain-model.md`](./organizations-domain-model.md).
>
> Al terminar este documento debe ser posible escribir las migraciones SQL sin volver a discutir el diseño.

---

## 1. Esquema de base de datos

### Esquema: `sales`

| Decisión | Detalle |
|----------|---------|
| Nombre | `sales` |
| Propósito | Bounded context comercial del BackOffice (captación, pipeline, agenda). |
| Aislamiento | Separado de `public` (producto iglesia / tenant `church_id`) y de cualquier esquema futuro `billing`, `support`, `iam`. |
| Justificación | El PRD exige separar por dominios. Organizations es la raíz del Sales Hub; Contacts, Activities, Tasks y Opportunities vivirán en el mismo esquema. |

### Distinción crítica con tablas existentes

Ya existe en el producto una entidad `organization` / `org_*` (enterprise: concilios, redes, reportes). **No es la misma entidad.**

| Tabla | Contexto | Significado |
|-------|----------|-------------|
| `public.organization` (+ `org_*`) | Producto / enterprise | Jerarquía organizacional del cliente. |
| **`sales.organizations`** | BackOffice comercial | Cuenta / prospecto con el que EvoChurch vende. |

Nunca reutilizar ni extender `public.organization` para el Sales Hub.

### Objetos de este diseño (MVP 0.1)

| Objeto | Tipo | Estado |
|--------|------|--------|
| `sales` | Schema | Crear si no existe |
| `sales.organizations` | Table | **Única tabla de esta feature** |
| Catálogos | Ver §3 | Sin tablas catálogo en 0.1 |

No se crean tablas de Contacts, Activities, Tasks ni Opportunities en este diseño.

---

## 2. Tabla principal: `sales.organizations`

Value Objects del dominio se **aplanan** en columnas (modelo relacional estándar). No se usan JSONB para Address / ContactInformation / WebPresence en el MVP: se filtran y buscan por ciudad, email, etc.

### 2.1 Identidad

| Campo | Tipo PostgreSQL | Nullable | Default | Descripción |
|-------|-----------------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK del agregado. UUID para estabilidad de FKs futuras y evitar secuencias expuestas. |

### 2.2 Identidad de negocio y clasificación

| Campo | Tipo PostgreSQL | Nullable | Default | Descripción |
|-------|-----------------|----------|---------|-------------|
| `name` | `text` | NO | — | Nombre de la organización. Trim obligatorio a nivel app/RPC. |
| `type` | `text` | NO | `'CHURCH'` | Discriminador `OrganizationType`. Valores: ver §3. |
| `denomination` | `text` | YES | `NULL` | Denominación / corriente (ej. Bautista). Opcional. |
| `status` | `text` | NO | `'ACTIVE'` | Ciclo de vida del **registro** (`ACTIVE` \| `ARCHIVED`). No es pipeline. |

### 2.3 Ubicación (VO `Address` aplanado)

| Campo | Tipo PostgreSQL | Nullable | Default | Descripción |
|-------|-----------------|----------|---------|-------------|
| `country` | `text` | NO | `'DO'` | País. Código ISO 3166-1 alpha-2 recomendado (`DO`, `US`, `PR`). Default operativo RD. |
| `province` | `text` | YES | `NULL` | Provincia / estado. |
| `city` | `text` | NO | — | Ciudad. Obligatoria (mínimo geográfico del dominio). |
| `address_line` | `text` | YES | `NULL` | Calle, número, sector. |

> Nombre `address_line` (no `address`) para no colisionar semánticamente con el VO completo y dejar espacio a `address_line_2` si hace falta.

### 2.4 Contacto institucional (VO `ContactInformation` aplanado)

| Campo | Tipo PostgreSQL | Nullable | Default | Descripción |
|-------|-----------------|----------|---------|-------------|
| `phone` | `text` | YES | `NULL` | Teléfono institucional. Formato libre en MVP; normalización en app. |
| `email` | `citext` | YES | `NULL` | Email institucional. `citext` para igualdad case-insensitive. |

> Si la extensión `citext` no estuviera habilitada en el proyecto, usar `text` + índice funcional `lower(email)`. Preferencia: habilitar `citext`.

### 2.5 Presencia web (VO `WebPresence` aplanado)

| Campo | Tipo PostgreSQL | Nullable | Default | Descripción |
|-------|-----------------|----------|---------|-------------|
| `website` | `text` | YES | `NULL` | URL del sitio. Validación de formato en app/RPC. |
| `facebook` | `text` | YES | `NULL` | Handle o path de Facebook. |
| `instagram` | `text` | YES | `NULL` | Handle de Instagram. |

### 2.6 Comercial

| Campo | Tipo PostgreSQL | Nullable | Default | Descripción |
|-------|-----------------|----------|---------|-------------|
| `source` | `text` | NO | — | Origen de captación (`OrganizationSource`). Sin default: debe elegirse al crear. |
| `owner_id` | `uuid` | YES | `NULL` | Responsable comercial. Referencia lógica a usuario BackOffice (`auth.users.id` o tabla IAM futura). Nullable en MVP; recomendado asignar en UI. |
| `notes` | `text` | YES | `NULL` | Observaciones internas del equipo. |

### 2.7 Ciclo de archivo (dominio) + auditoría / soft delete

| Campo | Tipo PostgreSQL | Nullable | Default | Descripción |
|-------|-----------------|----------|---------|-------------|
| `archived_at` | `timestamptz` | YES | `NULL` | Momento de archivo de negocio (`status = ARCHIVED`). `NULL` si activa. |
| `created_at` | `timestamptz` | NO | `now()` | Alta del registro. |
| `updated_at` | `timestamptz` | NO | `now()` | Última modificación (mantener vía trigger en migración). |
| `created_by` | `uuid` | YES | `NULL` | Usuario que creó. Preferible NOT NULL en runtime vía RPC; nullable para seeds/imports. |
| `updated_by` | `uuid` | YES | `NULL` | Usuario de la última modificación. |
| `deleted_at` | `timestamptz` | YES | `NULL` | Soft delete técnico. `NULL` = no eliminada. Ver §7. |

### 2.8 Campos explícitamente **excluidos** de esta tabla

| Campo tentador | Motivo de exclusión |
|----------------|---------------------|
| `pipeline_stage` | Vive en Opportunities. |
| `priority` / `temperature` | Vive en Opportunities. |
| `next_action` / `next_follow_up_at` | Vive en Tasks (derivado). |
| `last_activity_at` / `last_activity_type` | Vive en Activities (derivado). |
| `primary_contact_id` | Vive en Contacts (`is_primary`). |
| `church_id` / `customer_id` | Conversión a cliente = feature futura; no contaminar el MVP. |

Si en un sprint posterior se denormaliza alguno por rendimiento de listado, debe documentarse como **cache de lectura** con dueño de escritura en el otro contexto — nunca como fuente de verdad aquí.

---

## 3. Catálogos

### Criterio general

| Opción | Cuándo usarla | Coste de evolución |
|--------|---------------|--------------------|
| **PostgreSQL ENUM** | Conjuntos *extremadamente* estables y cerrados. | Alto: `ALTER TYPE ... ADD VALUE` es limitado; renombrar/quitar es doloroso. |
| **Tabla catálogo** | Valores con metadata (label, sort, `is_enabled`), editables o i18n. | Bajo: INSERT/UPDATE. |
| **Constantes de aplicación + `CHECK`** | Catálogos cerrados del dominio, pocos valores, controlados por el equipo. | Bajo-medio: migrar el `CHECK` al añadir valor. |

**Decisión MVP:** no usar PostgreSQL ENUM ni tablas catálogo. Usar **`text` + `CHECK`** respaldado por **constantes TypeScript** en la app. Motivos:

1. Extender `OrganizationType` (activar `MINISTRY`, etc.) no debe pelear con limitaciones de ENUM.
2. Aún no hay UI de administración de catálogos.
3. Labels UI viven en la capa de presentación (es/en), no en BD.
4. Un solo patrón para `type`, `status` y `source` reduce complejidad.

Cuando un catálogo necesite `is_enabled`, orden o labels administrables → promover a tabla `sales.organization_types` (etc.) **sin cambiar el tipo de columna** (`text` sigue siendo la FK lógica).

### 3.1 `type` → constantes de aplicación + CHECK

| Valor | Uso MVP |
|-------|---------|
| `CHURCH` | Único permitido en creación (regla de app). |
| `MINISTRY` | Reservado en CHECK. |
| `COUNCIL` | Reservado en CHECK. |
| `FOUNDATION` | Reservado en CHECK. |

- **BD:** `CHECK (type IN ('CHURCH','MINISTRY','COUNCIL','FOUNDATION'))`
- **App:** enum/const `OrganizationType`; feature flag / validación de creación solo `CHURCH`.

### 3.2 `status` → constantes de aplicación + CHECK

| Valor | Significado |
|-------|-------------|
| `ACTIVE` | Operativa. Default. |
| `ARCHIVED` | Archivada de negocio (`archived_at` NOT NULL). |

- **BD:** `CHECK (status IN ('ACTIVE','ARCHIVED'))` + coherencia con `archived_at` (ver §6).
- **No** es pipeline. No añadir `WON`/`LOST`/`CUSTOMER` aquí.

### 3.3 `source` → constantes de aplicación + CHECK

| Valor | Label UI |
|-------|----------|
| `REFERRAL` | Referido |
| `VISIT` | Visita |
| `SOCIAL_MEDIA` | Redes sociales |
| `EVENT` | Evento |
| `WEB` | Web |
| `OTHER` | Otro |

- **BD:** `CHECK (source IN (...))`
- **App:** const `OrganizationSource`.

### 3.4 `country`

- **MVP:** `text` con default `'DO'`. Validación ISO en app.
- **Futuro (opcional):** tabla `sales.countries` o catálogo global compartido — no requerido ahora.

### Resumen de decisiones de catálogo

| Atributo | Implementación MVP | Justificación |
|----------|-------------------|---------------|
| `type` | `text` + CHECK + consts app | Extensible; evita ENUM. |
| `status` | `text` + CHECK + consts app | Set mínimo y estable; mismo patrón. |
| `source` | `text` + CHECK + consts app | Cerrado en UI; labels en front. |
| PostgreSQL ENUM | **No** | Coste de evolución alto en Supabase/Postgres. |
| Tablas catálogo | **No en 0.1** | YAGNI; promover después si hace falta metadata. |

---

## 4. Relaciones futuras

La tabla se diseña como **ancla estable**. Las features satélite apuntan *hacia* `sales.organizations.id`. No se crean esas tablas ahora; solo se deja el contrato.

```
sales.organizations (1)
        │
        ├──< sales.contacts.organization_id          (1..N)   [futuro]
        ├──< sales.activities.organization_id        (1..N)   [futuro]
        ├──< sales.tasks.organization_id             (1..N)   [futuro]
        └──< sales.opportunities.organization_id     (1..N)   [futuro]
```

| Feature futura | Columna esperada en la tabla hija | Cardinalidad | Notas |
|----------------|-----------------------------------|--------------|-------|
| Contacts | `organization_id uuid NOT NULL` → `sales.organizations(id)` | 1..N | Un contacto `is_primary` por org (unique parcial). |
| Activities | `organization_id uuid NOT NULL` | 1..N | Timeline; deriva “última actividad”. |
| Tasks | `organization_id uuid NOT NULL` | 1..N | Deriva “próxima acción”. |
| Opportunities | `organization_id uuid NOT NULL` | 1..N | Pipeline, prioridad, temperatura. |

### FK salientes de `organizations` (hoy lógicas, mañana formales)

| Columna | Destino esperado | MVP |
|---------|------------------|-----|
| `owner_id` | Usuario BackOffice (`auth.users.id` o `iam.users`) | Sin FK dura hasta definir IAM del BackOffice. Índice sí. |
| `created_by` / `updated_by` | Mismo destino de identidad de usuario | Sin FK dura en 0.1. |

### Reglas de integridad futura (documentar para migraciones posteriores)

- `ON DELETE RESTRICT` desde hijos hacia `organizations`: no borrar físicamente una org con historial.
- Soft delete de org: los listados hijos filtran por `organizations.deleted_at IS NULL` o heredan política explícita.
- Archivar org (`ARCHIVED`): no cascada automática; Opportunities/Tasks decidirán cierre en su propio dominio (vía evento `OrganizationArchived`).

### Columna de conversión (reserva, no crear en 0.1)

Cuando exista Customers / provisioning:

- Opción A: `sales.customers.organization_id` → `organizations.id` (preferida; no ensucia organizations).
- Opción B (alternativa): `organizations.customer_id` nullable — solo si se necesita lookup inverso frecuente.

**Preferir A.** No añadir `customer_id` ni `church_id` en MVP.

---

## 5. Índices

Convención de nombres: `idx_organizations_<cols>` / `uq_organizations_<cols>` (ver §8).

| Nombre propuesto | Definición | Justificación |
|------------------|------------|---------------|
| `pk_organizations` | PRIMARY KEY (`id`) | Lookup por detalle y FKs futuras. |
| `idx_organizations_list_active` | `(status, created_at DESC) WHERE deleted_at IS NULL` | Listado operativo por defecto (activas, más recientes). |
| `idx_organizations_owner` | `(owner_id, status) WHERE deleted_at IS NULL` | Filtro “Responsable” del toolbar. |
| `idx_organizations_city` | `(city) WHERE deleted_at IS NULL` | Filtro por ciudad. |
| `idx_organizations_type` | `(type) WHERE deleted_at IS NULL` | Filtro / reportes por tipo. |
| `idx_organizations_source` | `(source) WHERE deleted_at IS NULL` | Analítica de captación. |
| `idx_organizations_name_trgm` | GIN `gin_trgm_ops` sobre `name` | Búsqueda “Buscar organizaciones…” (ILIKE / similarity). Requiere extensión `pg_trgm`. |
| `idx_organizations_email` | `(email) WHERE email IS NOT NULL AND deleted_at IS NULL` | Búsqueda / dedupe suave por email institucional. |

### Índices deliberadamente omitidos en 0.1

| Candidato | Motivo |
|-----------|--------|
| Unique duro `(lower(name), lower(city))` | Dominio: anti-duplicado es **advertencia**, no bloqueo. |
| Índice en `pipeline_*` | No existen esas columnas. |
| Full-text en `notes` | Volumen bajo; YAGNI. |

### Extensiones requeridas (para la migración posterior)

| Extensión | Uso |
|-----------|-----|
| `pgcrypto` o built-in `gen_random_uuid()` | PK uuid (en PG13+ suele bastar `pgcrypto` / `pg_catalog`). |
| `citext` | Columna `email` (opcional pero recomendada). |
| `pg_trgm` | Índice de búsqueda por nombre. |

---

## 6. Constraints

### 6.1 Primary Key

| Nombre | Definición |
|--------|------------|
| `pk_organizations` | `PRIMARY KEY (id)` |

### 6.2 Foreign Keys

| FK | Estado MVP |
|----|------------|
| Hijas → `organizations.id` | **No creadas** (tablas hijas no existen). Contrato en §4. |
| `owner_id` → usuario | **Diferida** hasta IAM BackOffice estable. |
| `created_by` / `updated_by` → usuario | **Diferida** (mismo motivo). |

### 6.3 Unique

| Constraint | Definición | Notas |
|------------|------------|-------|
| — | Ningún UNIQUE de negocio en 0.1 | Duplicados name+city: warning en app. Revisar en 0.2 si el ruido lo exige → unique parcial. |

Único UNIQUE implícito: PK.

### 6.4 Check Constraints

| Nombre propuesto | Expresión (conceptual) | Propósito |
|------------------|------------------------|-----------|
| `ck_organizations_name_not_blank` | `length(trim(name)) > 0` | Nombre siempre significativo. |
| `ck_organizations_city_not_blank` | `length(trim(city)) > 0` | Ciudad obligatoria. |
| `ck_organizations_type` | `type IN ('CHURCH','MINISTRY','COUNCIL','FOUNDATION')` | Catálogo cerrado. |
| `ck_organizations_status` | `status IN ('ACTIVE','ARCHIVED')` | Catálogo cerrado. |
| `ck_organizations_source` | `source IN ('REFERRAL','VISIT','SOCIAL_MEDIA','EVENT','WEB','OTHER')` | Catálogo cerrado. |
| `ck_organizations_archive_coherence` | `(status = 'ACTIVE' AND archived_at IS NULL) OR (status = 'ARCHIVED' AND archived_at IS NOT NULL)` | Coherencia archivo de negocio. |
| `ck_organizations_email_format` | `email IS NULL OR email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'` | Validación básica (app puede ser más estricta). |
| `ck_organizations_website_format` | `website IS NULL OR website ~* '^https?://'` | URL con esquema http(s). Ajustable si se aceptan URLs sin esquema (entonces validar solo en app). |

> Validaciones de formato en CHECK son una red de seguridad. La UX y mensajes de error viven en la aplicación.

### 6.5 NOT NULL (resumen)

Obligatorios: `id`, `name`, `type`, `status`, `country`, `city`, `source`, `created_at`, `updated_at`.

---

## 7. Auditoría y Soft Delete

### Campos estándar

| Campo | Rol |
|-------|-----|
| `id` | Identidad inmutable. |
| `created_at` | Alta. |
| `updated_at` | Última mutación (trigger `BEFORE UPDATE`). |
| `created_by` | Autor del alta. |
| `updated_by` | Autor de la última mutación. |
| `deleted_at` | Soft delete técnico. |

Más el campo de dominio `archived_at` (no es soft delete; es estado de negocio).

### Dos mecanismos distintos (no confundir)

| Mecanismo | Campos | Quién lo usa | Efecto en UI |
|-----------|--------|--------------|--------------|
| **Archivar** | `status = ARCHIVED`, `archived_at = now()` | Caso de uso comercial “archivar / reactivar” | Sale del listado operativo; puede verse en filtro “Archivadas”. |
| **Soft delete** | `deleted_at = now()` | Eliminación desde menú / admin (“Eliminar”) | Desaparece de **todos** los listados por defecto. Recuperable solo por soporte/SQL. |

### Estrategia de Soft Delete

1. **Nunca** `DELETE` físico en MVP (salvo jobs de purga documentados mucho más adelante).
2. Toda query de aplicación incluye `WHERE deleted_at IS NULL` (o vista `sales.organizations_active`).
3. Índices parciales del §5 usan `WHERE deleted_at IS NULL` para mantenerlos compactos.
4. Soft delete **no** cambia automáticamente `status`; una org eliminada puede quedar `ACTIVE` o `ARCHIVED` internamente — lo que manda para ocultarla es `deleted_at`.
5. Reactivar desde soft delete = `deleted_at = NULL` (operación privilegiada; no es el mismo caso de uso que “Reactivar archivada”).
6. FKs futuras: `ON DELETE RESTRICT` + soft delete en el padre evita huérfanos y borrones accidentales de historial comercial.

### Trigger esperado (solo especificación; no SQL aquí)

- `set_updated_at`: en cada UPDATE, `updated_at = now()`.
- Opcional: impedir UPDATE de filas con `deleted_at IS NOT NULL` salvo columnas de restauración.

---

## 8. Convenciones

Alineadas con el espíritu de `.evo/engineering/AI_DATABASE_GUIDE.md`, adaptadas al esquema `sales`.

### Tablas

| Regla | Ejemplo |
|-------|---------|
| Plural, `snake_case` | `organizations` |
| Calificadas por esquema | `sales.organizations` |
| Sin prefijo de feature en el nombre de tabla | `organizations`, no `sales_organizations` (el esquema ya nombra el contexto) |

### Campos

| Regla | Ejemplo |
|-------|---------|
| `snake_case` | `address_line`, `owner_id` |
| Booleanos: `is_` / `has_` (cuando existan) | — |
| Timestamps: `*_at`, siempre `timestamptz` | `created_at` |
| FKs / refs: `*_id` | `owner_id` |
| Soft delete: `deleted_at` | estándar del BackOffice sales |
| Textos de catálogo: `text` en mayúsculas snake del valor de dominio | `'SOCIAL_MEDIA'` |

### Índices

| Prefijo | Uso | Ejemplo |
|---------|-----|---------|
| `pk_` | Primary key | `pk_organizations` |
| `uq_` | Unique | `uq_organizations_...` |
| `idx_` | Index no único | `idx_organizations_owner` |
| `fk_` | Foreign key | `fk_contacts_organization_id` (futuro) |

Incluir el nombre de tabla en el índice para evitar colisiones entre esquemas/tablas.

### Constraints

| Prefijo | Uso | Ejemplo |
|---------|-----|---------|
| `pk_` | Primary key | `pk_organizations` |
| `fk_` | Foreign key | `fk_activities_organization_id` |
| `uq_` | Unique | `uq_contacts_one_primary_per_org` |
| `ck_` | Check | `ck_organizations_status` |

### Valores de catálogo en BD

- Siempre **UPPER_SNAKE** en inglés: `CHURCH`, `SOCIAL_MEDIA`, `ARCHIVED`.
- Labels localizados solo en la capa UI.

### Vistas (opcional, no obligatorias en 0.1)

| Vista | Definición conceptual |
|-------|----------------------|
| `sales.v_organizations_open` | `deleted_at IS NULL AND status = 'ACTIVE'` |

Útil para RPC de listado; no sustituye la tabla base.

---

## 9. Escalabilidad

Objetivo: **decenas de miles** de organizaciones (~10⁴–10⁵) sin rediseño.

| Factor | Cómo lo cubre este diseño |
|--------|---------------------------|
| PK UUID | Inserciones concurrentes sin hot sequence; FKs estables para hijos. |
| Índices parciales `deleted_at IS NULL` | El set “vivo” permanece pequeño aunque crezca el histórico soft-deleted. |
| Listado por `(status, created_at DESC)` | Paginación keyset/offset viable; orden natural del inbox comercial. |
| Búsqueda `pg_trgm` en `name` | Escala mejor que `ILIKE '%x%'` seq-scan cuando el volumen crece. |
| Sin JSONB opaco en campos filtrables | Ciudad, owner, type, source siguen siendo columnas indexables. |
| Agregado delgado | Pipeline/actividades fuera de la fila → la fila de org no engorda con historial. |
| Ancla por `id` | Contacts/Activities/Tasks/Opportunities particionables o archivables por su cuenta sin tocar `organizations`. |
| Catálogos como `text`+CHECK | Añadir un tipo nuevo = migración de CHECK mínima, sin rewrite de tabla. |
| Soft delete + archive | Retención de historial sin `DELETE` masivos ni vacuum de urgencia por purgas. |

### Umbrales donde *sí* habría que evolucionar (no ahora)

| Síntoma | Evolución posible |
|---------|-------------------|
| Listados con joins pesados a “última actividad / pipeline” | Cache denormalizado controlado o vista materializada. |
| Búsqueda full-text multi-campo | `tsvector` o motor externo. |
| Multi-país con catálogos ricos | Tablas `sales.countries` / `organization_types`. |
| Millones de filas + tenants comerciales (partners) | RLS por `owner_id` / org comercial + particionado por tiempo. |

Ninguno de esos cambios exige renombrar ni romper `sales.organizations.id`.

---

## 10. Checklist para la migración SQL (siguiente documento)

Cuando se escriba `organizations-sql.md` / la migración, debe cubrir exactamente:

1. `CREATE SCHEMA IF NOT EXISTS sales;`
2. Extensiones: `citext`, `pg_trgm` (si no existen).
3. `CREATE TABLE sales.organizations` con columnas del §2.
4. Constraints del §6 (`pk_`, `ck_`).
5. Índices del §5.
6. Trigger `updated_at`.
7. Grants mínimos a roles Supabase (`authenticated` / `service_role`) — detalle en SQL/API docs.
8. **No** crear Contacts, Activities, Tasks, Opportunities.
9. **No** crear ENUMs de PostgreSQL.
10. **No** tocar `public.organization`.

---

## 11. Mapa dominio → columna (referencia rápida)

| Dominio | Columna BD |
|---------|------------|
| `id` | `id` |
| `name` | `name` |
| `type` | `type` |
| `denomination` | `denomination` |
| `status` | `status` |
| `address.country` | `country` |
| `address.province` | `province` |
| `address.city` | `city` |
| `address.line` | `address_line` |
| `contactInfo.phone` | `phone` |
| `contactInfo.email` | `email` |
| `webPresence.website` | `website` |
| `webPresence.facebook` | `facebook` |
| `webPresence.instagram` | `instagram` |
| `source` | `source` |
| `ownerId` | `owner_id` |
| `notes` | `notes` |
| `archivedAt` | `archived_at` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `createdBy` | `created_by` |
| *(auditoría prompt)* | `updated_by`, `deleted_at` |
